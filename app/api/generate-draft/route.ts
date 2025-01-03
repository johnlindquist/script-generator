import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../auth/[...nextauth]/route'
import { model } from '@/lib/gemini'
import { DRAFT_PASS_PROMPT, cleanCodeFences, extractUserInfo } from '@/lib/generation'
import { wrapApiHandler } from '@/lib/timing'
import { logInteraction } from '@/lib/interaction-logger'
import crypto from 'crypto'

// Explicitly declare this route uses Node.js runtime
export const runtime = 'nodejs'

const DAILY_LIMIT = 24

const generateDraftScript = async (req: NextRequest) => {
  const requestId = Math.random().toString(36).substring(7)
  try {
    const interactionTimestamp = req.headers.get('Interaction-Timestamp')
    const body = await req.json().catch(() => ({}))
    const { prompt, luckyRequestId } = body

    if (!interactionTimestamp) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')
      logInteraction(timestamp, 'serverRoute', 'Missing interaction timestamp')
      return NextResponse.json({ error: 'Missing interaction timestamp' }, { status: 400 })
    }

    logInteraction(interactionTimestamp, 'serverRoute', 'Started /api/generate-draft route', {
      requestId,
      luckyRequestId,
      source: luckyRequestId ? 'lucky' : 'direct',
    })

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      logInteraction(interactionTimestamp, 'serverRoute', 'Unauthorized request', { requestId })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!prompt) {
      logInteraction(interactionTimestamp, 'serverRoute', 'Missing prompt', { requestId })
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
    }

    logInteraction(interactionTimestamp, 'serverRoute', 'Checking user usage', {
      userId: session.user.id,
      requestId,
      source: luckyRequestId ? 'lucky' : 'direct',
    })

    // Get or create usage record for today
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!dbUser) {
      logInteraction(interactionTimestamp, 'serverRoute', 'User not found in database', {
        requestId,
      })
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
        requestId,
        source: luckyRequestId ? 'lucky' : 'direct',
      })
      usage = await prisma.usage.create({
        data: {
          userId: session.user.id,
          date: now,
          count: 0,
        },
      })
    }

    logInteraction(interactionTimestamp, 'serverRoute', 'Current usage status', {
      userId: session.user.id,
      currentCount: usage.count,
      limit: DAILY_LIMIT,
      requestId,
      source: luckyRequestId ? 'lucky' : 'direct',
    })

    if (usage.count >= DAILY_LIMIT) {
      logInteraction(interactionTimestamp, 'serverRoute', 'Daily limit reached', {
        userId: session.user.id,
        count: usage.count,
        requestId,
        source: luckyRequestId ? 'lucky' : 'direct',
      })
      return NextResponse.json(
        {
          error: 'Daily generation limit reached',
          details: `You have used all ${DAILY_LIMIT} generations for today. Try again tomorrow!`,
        },
        { status: 429 }
      )
    }

    // Generate draft script using Gemini
    const draftPrompt = DRAFT_PASS_PROMPT.replace('{prompt}', prompt).replace(
      '{userInfo}',
      JSON.stringify(extractUserInfo(session, dbUser))
    )

    logInteraction(interactionTimestamp, 'serverRoute', 'Starting draft generation', {
      prompt,
      requestId,
      source: luckyRequestId ? 'lucky' : 'direct',
    })

    const result = await model.generateContentStream(draftPrompt)

    let aborted = false
    // Generate a script ID for client compatibility
    const scriptId = crypto.randomUUID()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(new TextEncoder().encode(`__SCRIPT_ID__${scriptId}__SCRIPT_ID__`))

          for await (const chunk of result.stream) {
            if (aborted) {
              logInteraction(interactionTimestamp, 'serverRoute', 'Generation aborted', {
                scriptId,
                requestId,
                source: luckyRequestId ? 'lucky' : 'direct',
              })
              break
            }
            const text = cleanCodeFences(chunk.text())
            controller.enqueue(new TextEncoder().encode(text))
          }

          if (!aborted) {
            logInteraction(interactionTimestamp, 'serverRoute', 'Draft generation completed', {
              scriptId,
              requestId,
              source: luckyRequestId ? 'lucky' : 'direct',
            })

            controller.enqueue(new TextEncoder().encode(''))
            controller.close()
          } else {
            controller.close()
          }
        } catch (error) {
          logInteraction(interactionTimestamp, 'serverRoute', 'Stream error', {
            scriptId,
            error: error instanceof Error ? error.message : String(error),
            requestId,
            source: luckyRequestId ? 'lucky' : 'direct',
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

    const body = await req.json().catch(() => ({}))
    const { luckyRequestId } = body

    logInteraction(interactionTimestamp, 'serverRoute', 'Error in /api/generate-draft route', {
      error: error instanceof Error ? error.message : String(error),
      requestId,
      source: luckyRequestId ? 'lucky' : 'direct',
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

export const POST = wrapApiHandler('generate_draft_script', generateDraftScript)
