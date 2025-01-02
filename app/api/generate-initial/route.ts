import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../auth/[...nextauth]/route'
import { model } from '@/lib/gemini'
import { INITIAL_PASS_PROMPT, cleanCodeFences } from '@/lib/generation'
import { wrapApiHandler } from '@/lib/timing'
import { writeDebugFile, debugLog } from '@/lib/debug'

const DAILY_LIMIT = 24

const generateInitialScript = async (req: NextRequest) => {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
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
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    if (!requestId || requestId.trim().length === 0) {
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
      usage = await prisma.usage.create({
        data: {
          userId: session.user.id,
          date: now,
          count: 0,
        },
      })
    }

    if (usage.count >= DAILY_LIMIT) {
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
      JSON.stringify({
        name: session.user.name,
        image: session.user.image,
      })
    )

    // Debug the incoming prompt
    writeDebugFile(
      `initial_incoming_prompt_id_${requestId}`,
      `Raw Prompt:\n${prompt}\n\nFull Initial Prompt:\n${initialPrompt}`
    )
    debugLog('Initial Generation Starting:', requestId)
    debugLog('Prompt Length:', prompt.length)

    const result = await model.generateContentStream(initialPrompt)

    let fullScript = ''
    let aborted = false

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            if (aborted) break
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

              // Create initial version
              await prisma.scriptVersion.create({
                data: {
                  scriptId: script.id,
                  content: fullScript,
                },
              })

              // Write debug files and log
              writeDebugFile(`initial_script_id_${script.id}`, fullScript)
              writeDebugFile(
                `initial_prompt_id_${script.id}`,
                INITIAL_PASS_PROMPT.replace('{prompt}', prompt).replace(
                  '{userInfo}',
                  JSON.stringify({ name: session.user.name, image: session.user.image })
                )
              )

              debugLog('Initial Generation Complete:', script.id)

              // Add a special delimiter to indicate the script ID
              controller.enqueue(
                new TextEncoder().encode(`\n__SCRIPT_ID__${script.id}__SCRIPT_ID__\n`)
              )
              controller.enqueue(new TextEncoder().encode(''))
              controller.close()
            } catch (dbError) {
              const errorMessage =
                dbError instanceof Error ? dbError.message : 'Database error occurred'
              controller.error(new Error(errorMessage))
            }
          } else {
            controller.close()
          }
        } catch (streamError) {
          const errorMessage =
            streamError instanceof Error ? streamError.message : 'Stream error occurred'
          controller.error(new Error(errorMessage))
        }
      },
      cancel() {
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
    console.error('Generate initial error:', error)
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
