import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../auth/[...nextauth]/route'
import { model } from '@/lib/gemini'
import { INITIAL_PASS_PROMPT, cleanCodeFences, extractUserInfo } from '@/lib/generation'
import { wrapApiHandler } from '@/lib/timing'
import { logInteraction } from '@/lib/interaction-logger'

// Explicitly declare this route uses Node.js runtime
export const runtime = 'nodejs'

const DAILY_LIMIT = 24

const generateInitialScript = async (req: NextRequest) => {
  try {
    const interactionTimestamp = req.headers.get('Interaction-Timestamp')
    const body = await req.json().catch(() => ({}))
    const { prompt } = body

    if (!interactionTimestamp) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')
      logInteraction(timestamp, 'serverRoute', 'Missing interaction timestamp')
      return NextResponse.json({ error: 'Missing interaction timestamp' }, { status: 400 })
    }

    logInteraction(interactionTimestamp, 'serverRoute', 'Started /api/generate-initial route')

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      logInteraction(interactionTimestamp, 'serverRoute', 'Unauthorized request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!prompt) {
      logInteraction(interactionTimestamp, 'serverRoute', 'Missing prompt')
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
    }

    logInteraction(interactionTimestamp, 'serverRoute', 'Checking user usage', {
      userId: session.user.id,
    })

    // Get or create usage record for today
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!dbUser) {
      logInteraction(interactionTimestamp, 'serverRoute', 'User not found in database')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let usage = await prisma.usage.findUnique({
      where: {
        userId_date: {
          userId: session.user.id,
          date: now,
        },
      },
    })

    if (!usage) {
      logInteraction(interactionTimestamp, 'serverRoute', 'Creating new usage record', {
        userId: session.user.id,
      })
      usage = await prisma.usage.create({
        data: {
          userId: session.user.id,
          date: now,
          count: 0,
        },
      })
    }

    if (usage.count >= DAILY_LIMIT) {
      logInteraction(interactionTimestamp, 'serverRoute', 'Daily limit reached', {
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

    // Create a new script record
    const script = await prisma.script.create({
      data: {
        ownerId: session.user.id,
        summary: prompt,
        status: 'IN_PROGRESS',
        title: prompt.slice(0, 100),
        content: '',
      },
    })

    logInteraction(interactionTimestamp, 'serverRoute', 'Created new script record', {
      scriptId: script.id,
    })

    // Generate initial script using Gemini
    const initialPrompt = INITIAL_PASS_PROMPT.replace('{prompt}', prompt).replace(
      '{userInfo}',
      JSON.stringify(extractUserInfo(session, dbUser))
    )

    logInteraction(interactionTimestamp, 'serverRoute', 'Starting initial generation', {
      scriptId: script.id,
      prompt,
    })

    const result = await model.generateContentStream(initialPrompt)

    let fullScript = ''
    let aborted = false

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send script ID first
          controller.enqueue(new TextEncoder().encode(`__SCRIPT_ID__${script.id}__SCRIPT_ID__`))

          for await (const chunk of result.stream) {
            if (aborted) {
              logInteraction(interactionTimestamp, 'serverRoute', 'Generation aborted', {
                scriptId: script.id,
              })
              break
            }
            const text = cleanCodeFences(chunk.text())
            fullScript += text
            controller.enqueue(new TextEncoder().encode(text))
          }

          if (!aborted) {
            try {
              await prisma.script.update({
                where: { id: script.id },
                data: {
                  content: fullScript,
                  status: 'IN_PROGRESS',
                },
              })

              logInteraction(interactionTimestamp, 'serverRoute', 'Initial generation completed', {
                scriptId: script.id,
              })

              // Store the initial version
              await prisma.scriptVersion.create({
                data: {
                  scriptId: script.id,
                  content: fullScript,
                },
              })

              controller.enqueue(new TextEncoder().encode(''))
              controller.close()
            } catch (dbError) {
              const errorMessage =
                dbError instanceof Error ? dbError.message : 'Database error occurred'
              logInteraction(interactionTimestamp, 'serverRoute', 'Database error', {
                scriptId: script.id,
                error: errorMessage,
              })
              controller.error(new Error(errorMessage))
            }
          } else {
            controller.close()
          }
        } catch (error) {
          logInteraction(interactionTimestamp, 'serverRoute', 'Stream error', {
            scriptId: script.id,
            error: error instanceof Error ? error.message : String(error),
          })
          controller.error(error)
        }
      },
      cancel() {
        aborted = true
      },
    })

    return new NextResponse(stream)
  } catch (error) {
    const interactionTimestamp =
      req.headers.get('Interaction-Timestamp') ||
      new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')

    logInteraction(interactionTimestamp, 'serverRoute', 'Error in /api/generate-initial route', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      {
        error: 'Failed to generate script',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export const POST = wrapApiHandler('generate_initial_script', generateInitialScript)
