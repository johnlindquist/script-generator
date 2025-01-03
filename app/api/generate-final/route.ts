import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../auth/[...nextauth]/route'
import { model } from '@/lib/gemini'
import { FINAL_PASS_PROMPT, cleanCodeFences, extractUserInfo } from '@/lib/generation'
import { wrapApiHandler } from '@/lib/timing'
import { logInteraction } from '@/lib/interaction-logger'

// Explicitly declare this route uses Node.js runtime
export const runtime = 'nodejs'

const DAILY_LIMIT = 24

const generateFinalScript = async (req: NextRequest) => {
  const requestId = Math.random().toString(36).substring(7)
  try {
    const interactionTimestamp = req.headers.get('Interaction-Timestamp') || 'unknown'
    logInteraction(interactionTimestamp, 'serverRoute', 'Started /api/generate-final route', {
      requestId,
    })

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      logInteraction(interactionTimestamp, 'serverRoute', 'Unauthorized request', { requestId })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { scriptId, luckyRequestId, draftScript } = await req.json()
    if (!scriptId || !draftScript) {
      logInteraction(interactionTimestamp, 'serverRoute', 'Missing required fields', { requestId })
      return NextResponse.json({ error: 'Missing scriptId or draftScript' }, { status: 400 })
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

    logInteraction(interactionTimestamp, 'serverRoute', 'Starting final generation', {
      scriptId,
      prompt: draftScript,
      requestId,
      source: luckyRequestId ? 'lucky' : 'direct',
    })

    // Generate final script using Gemini
    const finalPrompt = FINAL_PASS_PROMPT.replace('{script}', draftScript)
      .replace('{prompt}', draftScript || '')
      .replace('{userInfo}', JSON.stringify(extractUserInfo(session, dbUser)))

    const result = await model.generateContentStream(finalPrompt)

    let fullScript = ''
    let aborted = false

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            if (aborted) {
              logInteraction(interactionTimestamp, 'serverRoute', 'Final generation aborted', {
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
                logInteraction(interactionTimestamp, 'serverRoute', 'Final generation superseded', {
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

              logInteraction(interactionTimestamp, 'serverRoute', 'Final generation completed', {
                scriptId,
                requestId,
                source: luckyRequestId ? 'lucky' : 'direct',
              })

              // Store the draft version
              await prisma.scriptVersion.create({
                data: {
                  scriptId,
                  content: draftScript,
                },
              })

              // Store the final version
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
    logInteraction(interactionTimestamp, 'serverRoute', 'Error in /api/generate-final route', {
      error: error instanceof Error ? error.message : String(error),
      requestId,
      source: luckyRequestId ? 'lucky' : 'direct',
    })
    return NextResponse.json(
      {
        error: 'Failed to generate final script',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export const POST = wrapApiHandler('generate_final_script', generateFinalScript)
