import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../auth/[...nextauth]/route'
import { model } from '@/lib/gemini'
import { INITIAL_PASS_PROMPT, cleanCodeFences, extractUserInfo } from '@/lib/generation'
import { wrapApiHandler } from '@/lib/timing'
import { debugLog, writeDebugFile } from '@/lib/debug-node'

// Explicitly declare this route uses Node.js runtime
export const runtime = 'nodejs'

const DAILY_LIMIT = 24

const generateInitialScript = async (req: NextRequest) => {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      debugLog('generate-initial', 'Unauthorized - No valid user ID')
      return NextResponse.json(
        {
          error: 'Unauthorized - No valid user ID',
          details: 'Please try signing out and signing back in',
        },
        { status: 401 }
      )
    }

    // Check if user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!dbUser) {
      debugLog('generate-initial', 'Creating new user', { userId: session.user.id })
      // Create user if they don't exist
      await prisma.user.create({
        data: {
          id: session.user.id,
          username:
            session.user.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ??
            session.user.email?.split('@')[0] ??
            'unknown-user',
        },
      })
    }

    const { prompt, requestId } = await req.json()
    if (!prompt) {
      debugLog('generate-initial', 'Missing prompt')
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    if (!requestId || requestId.trim().length === 0) {
      debugLog('generate-initial', 'Missing or invalid requestId')
      return NextResponse.json({ error: 'A valid requestId is required' }, { status: 400 })
    }

    // Check and increment usage count
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    let usage = await prisma.usage.findUnique({
      where: {
        userId_date: {
          userId: session.user.id,
          date: now,
        },
      },
    })

    if (!usage) {
      debugLog('generate-initial', 'Creating new usage record', { userId: session.user.id })
      usage = await prisma.usage.create({
        data: {
          userId: session.user.id,
          date: now,
          count: 0,
        },
      })
    }

    if (usage.count >= DAILY_LIMIT) {
      debugLog('generate-initial', 'Daily limit reached', {
        userId: session.user.id,
        count: usage.count,
      })
      return NextResponse.json(
        {
          error: 'Daily generation limit reached',
          details: `You have used all ${DAILY_LIMIT} generations for today. Try again tomorrow!`,
        },
        { status: 429 }
      )
    }

    // Increment usage count
    await prisma.usage.update({
      where: {
        userId_date: {
          userId: session.user.id,
          date: now,
        },
      },
      data: {
        count: { increment: 1 },
      },
    })

    // Generate initial script using Gemini
    const initialPrompt = INITIAL_PASS_PROMPT.replace('{prompt}', prompt).replace(
      '{userInfo}',
      JSON.stringify(extractUserInfo(session, dbUser))
    )

    // Debug the incoming prompt
    const debugPromptContent = `Raw Prompt:\n${prompt}\n\nFull Initial Prompt:\n${initialPrompt}`
    writeDebugFile(`initial_incoming_prompt_id_${requestId}`, debugPromptContent)
    debugLog('generate-initial', 'Starting generation', { requestId, promptLength: prompt.length })

    const result = await model.generateContentStream(initialPrompt)

    let fullScript = ''
    let aborted = false

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            if (aborted) {
              debugLog('generate-initial', 'Generation aborted', { requestId })
              break
            }
            const text = cleanCodeFences(chunk.text())
            fullScript += text
            controller.enqueue(new TextEncoder().encode(text))
          }

          if (!aborted) {
            try {
              // Check for existing script with this requestId
              const existingScript = await prisma.script.findUnique({
                where: { requestId },
              })

              let script
              if (existingScript) {
                debugLog('generate-initial', 'Updating existing script', {
                  requestId,
                  scriptId: existingScript.id,
                })
                // Update existing script
                script = await prisma.script.update({
                  where: { requestId },
                  data: {
                    content: fullScript,
                    title: prompt.slice(0, 100),
                    summary: prompt,
                    ownerId: session.user.id,
                    saved: false,
                    status: 'IN_PROGRESS',
                  },
                })
              } else {
                debugLog('generate-initial', 'Creating new script', { requestId })
                // Create new script
                script = await prisma.script.create({
                  data: {
                    content: fullScript,
                    title: prompt.slice(0, 100),
                    summary: prompt,
                    requestId,
                    ownerId: session.user.id,
                    saved: false,
                    status: 'IN_PROGRESS',
                  },
                })
              }

              debugLog('generate-initial', 'Generation completed successfully', {
                scriptId: script.id,
              })

              // Create initial version
              await prisma.scriptVersion.create({
                data: {
                  scriptId: script.id,
                  content: fullScript,
                },
              })

              // Write debug files and log
              writeDebugFile(`initial_script_id_${script.id}`, fullScript)
              const debugInitialPrompt = INITIAL_PASS_PROMPT.replace('{prompt}', prompt).replace(
                '{userInfo}',
                JSON.stringify(extractUserInfo(session, dbUser))
              )
              writeDebugFile(`initial_prompt_id_${script.id}`, debugInitialPrompt)

              debugLog('generate-initial', 'Generation complete', { scriptId: script.id })

              // Add a special delimiter to indicate the script ID
              controller.enqueue(
                new TextEncoder().encode(`\n__SCRIPT_ID__${script.id}__SCRIPT_ID__\n`)
              )
              controller.enqueue(new TextEncoder().encode(''))
              controller.close()
            } catch (dbError) {
              const errorMessage =
                dbError instanceof Error ? dbError.message : 'Database error occurred'
              debugLog('generate-initial', 'Database error during generation', {
                requestId,
                error: errorMessage,
              })
              controller.error(new Error(errorMessage))
            }
          } else {
            controller.close()
          }
        } catch (streamError) {
          const errorMessage =
            streamError instanceof Error ? streamError.message : 'Stream error occurred'
          debugLog('generate-initial', 'Stream error during generation', {
            requestId,
            error: errorMessage,
          })
          controller.error(new Error(errorMessage))
        }
      },
      cancel() {
        debugLog('generate-initial', 'Generation cancelled', { requestId })
        aborted = true
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    debugLog('generate-initial', 'Error generating initial script', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      {
        error: 'Failed to generate initial script',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export const POST = wrapApiHandler('generate_initial_script', generateInitialScript)
