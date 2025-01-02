import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../auth/[...nextauth]/route'
import { model } from '@/lib/gemini'
import { SECOND_PASS_PROMPT, cleanCodeFences, extractUserInfo } from '@/lib/generation'
import { wrapApiHandler } from '@/lib/timing'
import { logInteraction } from '@/lib/interaction-logger'

// Explicitly declare this route uses Node.js runtime
export const runtime = 'nodejs'

const DAILY_LIMIT = 24

const generateScript = async (req: NextRequest) => {
  const requestId = Math.random().toString(36).substring(7)
  try {
    const interactionTimestamp = req.headers.get('Interaction-Timestamp') || 'unknown'
    logInteraction(interactionTimestamp, 'serverRoute', 'Started /api/generate route', {
      requestId,
    })

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      logInteraction(interactionTimestamp, 'serverRoute', 'Unauthorized request', { requestId })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { scriptId, luckyRequestId } = await req.json()
    if (!scriptId) {
      logInteraction(interactionTimestamp, 'serverRoute', 'Missing scriptId', { requestId })
      return NextResponse.json({ error: 'Missing scriptId' }, { status: 400 })
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

    // Increment usage count
    const updatedUsage = await prisma.usage.update({
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

    logInteraction(interactionTimestamp, 'serverRoute', 'Usage incremented', {
      userId: session.user.id,
      newCount: updatedUsage.count,
      requestId,
      source: luckyRequestId ? 'lucky' : 'direct',
    })

    // Get the initial script from the database
    const initialScript = await prisma.script.findUnique({
      where: { id: scriptId },
    })

    if (!initialScript) {
      logInteraction(interactionTimestamp, 'serverRoute', 'Script not found', {
        scriptId,
        requestId,
      })
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    if (initialScript.ownerId !== session.user.id) {
      logInteraction(interactionTimestamp, 'serverRoute', 'Unauthorized script access', {
        scriptId,
        userId: session.user.id,
        requestId,
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (initialScript.status !== 'IN_PROGRESS') {
      logInteraction(interactionTimestamp, 'serverRoute', 'Invalid script status', {
        scriptId,
        status: initialScript.status,
        requestId,
      })
      return NextResponse.json({ error: 'Script is not ready for refinement' }, { status: 400 })
    }

    // Update status to show we're still refining
    await prisma.script.update({
      where: { id: scriptId },
      data: {
        status: 'IN_PROGRESS',
        requestId: requestId, // Track the request ID to prevent duplicates
      },
    })

    logInteraction(interactionTimestamp, 'serverRoute', 'Starting refinement', {
      scriptId,
      prompt: initialScript.summary,
      requestId,
      source: luckyRequestId ? 'lucky' : 'direct',
    })

    // Generate refined script using Gemini
    const refinementPrompt = SECOND_PASS_PROMPT.replace('{script}', initialScript.content)
      .replace('{prompt}', initialScript.summary || '')
      .replace('{userInfo}', JSON.stringify(extractUserInfo(session, dbUser)))

    const result = await model.generateContentStream(refinementPrompt)

    let fullScript = ''
    let aborted = false

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            if (aborted) {
              logInteraction(interactionTimestamp, 'serverRoute', 'Refinement aborted', {
                scriptId,
                requestId,
                source: luckyRequestId ? 'lucky' : 'direct',
              })
              break
            }
            const text = cleanCodeFences(chunk.text())

            // Add the text to our buffer without trimming
            fullScript += text
            controller.enqueue(new TextEncoder().encode(text))
          }

          if (!aborted) {
            try {
              // Check if this is still the active request
              const currentScript = await prisma.script.findUnique({
                where: { id: scriptId },
                select: { requestId: true },
              })

              if (currentScript?.requestId !== requestId) {
                logInteraction(interactionTimestamp, 'serverRoute', 'Refinement superseded', {
                  scriptId,
                  requestId,
                  currentRequestId: currentScript?.requestId,
                })
                controller.close()
                return
              }

              await prisma.script.update({
                where: { id: scriptId },
                data: {
                  content: fullScript,
                  status: 'COMPLETED',
                  requestId: requestId,
                },
              })

              logInteraction(interactionTimestamp, 'serverRoute', 'Refinement completed', {
                scriptId,
                requestId,
                source: luckyRequestId ? 'lucky' : 'direct',
              })

              // Store the pre-refinement version
              await prisma.scriptVersion.create({
                data: {
                  scriptId,
                  content: initialScript.content,
                },
              })

              // Store the refined version
              await prisma.scriptVersion.create({
                data: {
                  scriptId,
                  content: fullScript,
                },
              })

              controller.enqueue(new TextEncoder().encode(''))
              controller.close()
            } catch (dbError) {
              const errorMessage =
                dbError instanceof Error ? dbError.message : 'Database error occurred'
              logInteraction(interactionTimestamp, 'serverRoute', 'Database error', {
                scriptId,
                error: errorMessage,
                requestId,
                source: luckyRequestId ? 'lucky' : 'direct',
              })
              controller.error(new Error(errorMessage))
            }
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
    const interactionTimestamp = req.headers.get('Interaction-Timestamp') || 'unknown'
    const body = await req.json().catch(() => ({}))
    const { luckyRequestId } = body
    logInteraction(interactionTimestamp, 'serverRoute', 'Error in /api/generate route', {
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

export const POST = wrapApiHandler('generate_script', generateScript)
