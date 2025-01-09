import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../auth/[...nextauth]/route'
import { model } from '@/lib/gemini'
import { cleanCodeFences, extractUserInfo } from '@/lib/generation'
import { wrapApiHandler } from '@/lib/timing'
import { logInteraction } from '@/lib/interaction-logger'
import crypto from 'crypto'
import { DRAFT_PASS_PROMPT } from './prompt'

// Explicitly declare this route uses Node.js runtime
export const runtime = 'nodejs'

const DAILY_LIMIT = 24

const generateDraftScript = async (req: NextRequest) => {
  const requestId = Math.random().toString(36).substring(7)
  console.log('[API Route] Starting generateDraftScript:', { requestId })

  try {
    // Early session validation
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      console.log('[API Route] No valid session:', { requestId })
      return NextResponse.json({ error: 'Session expired. Please sign in again.' }, { status: 401 })
    }

    const interactionTimestamp = req.headers.get('Interaction-Timestamp')
    const body = await req.json().catch(() => ({}))
    const { prompt, luckyRequestId } = body

    console.log('[API Route] Request details:', {
      requestId,
      luckyRequestId,
      hasPrompt: !!prompt,
      hasTimestamp: !!interactionTimestamp,
      userId: session.user.id,
      source: luckyRequestId ? 'lucky' : 'direct',
    })

    if (!interactionTimestamp) {
      console.error('[API Route] Missing interaction timestamp:', { requestId })
      return NextResponse.json({ error: 'Missing interaction timestamp' }, { status: 400 })
    }

    logInteraction(interactionTimestamp, 'serverRoute', 'Started /api/generate-draft route', {
      requestId,
      luckyRequestId,
      source: luckyRequestId ? 'lucky' : 'direct',
    })

    if (!prompt) {
      console.error('[API Route] Missing prompt:', { requestId })
      logInteraction(interactionTimestamp, 'serverRoute', 'Missing prompt', { requestId })
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
    }

    console.log('[API Route] Checking user usage:', {
      requestId,
      userId: session.user.id,
      source: luckyRequestId ? 'lucky' : 'direct',
    })

    // Get or create usage record for today
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!dbUser) {
      console.error('[API Route] User not found:', { requestId, userId: session.user.id })
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
      console.log('[API Route] Creating new usage record:', {
        requestId,
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

    console.log('[API Route] Current usage status:', {
      requestId,
      userId: session.user.id,
      currentCount: usage.count,
      limit: DAILY_LIMIT,
      source: luckyRequestId ? 'lucky' : 'direct',
    })

    if (usage.count >= DAILY_LIMIT) {
      console.log('[API Route] Daily limit reached:', {
        requestId,
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

    // Generate draft script using Gemini
    const draftPrompt = DRAFT_PASS_PROMPT.replace('{prompt}', prompt).replace(
      '{userInfo}',
      JSON.stringify(extractUserInfo(session, dbUser))
    )

    console.log('[API Route] Starting draft generation:', {
      requestId,
      prompt,
      source: luckyRequestId ? 'lucky' : 'direct',
    })

    const result = await model.generateContentStream(draftPrompt)

    let aborted = false
    // Generate a script ID for client compatibility
    const scriptId = crypto.randomUUID()

    console.log('[API Route] Created script ID:', { requestId, scriptId })

    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('[API Route] Starting stream:', { requestId, scriptId })
          controller.enqueue(new TextEncoder().encode(`__SCRIPT_ID__${scriptId}__SCRIPT_ID__`))

          try {
            for await (const chunk of result.stream) {
              if (aborted) {
                console.log('[API Route] Generation aborted:', { requestId, scriptId })
                break
              }
              const text = cleanCodeFences(chunk.text())
              console.log('[API Route] Streaming chunk:', {
                requestId,
                scriptId,
                chunkSize: text.length,
              })
              controller.enqueue(new TextEncoder().encode(text))
            }
          } catch (streamError) {
            if (streamError instanceof Error && streamError.name === 'AbortError') {
              console.log('[API Route] Stream aborted:', { requestId, scriptId })
              aborted = true
              return
            }
            throw streamError
          }

          if (!aborted) {
            console.log('[API Route] Draft generation completed:', { requestId, scriptId })
            controller.enqueue(new TextEncoder().encode(''))
          }
          controller.close()
        } catch (error) {
          console.error('[API Route] Stream error:', {
            requestId,
            scriptId,
            error: error instanceof Error ? error.message : String(error),
          })
          controller.error(error)
        }
      },
      cancel() {
        console.log('[API Route] Stream cancelled:', { requestId, scriptId })
        aborted = true
      },
    })

    console.log('[API Route] Returning stream response:', { requestId, scriptId })
    return new NextResponse(stream)
  } catch (error) {
    console.error('[API Route] Error in generateDraftScript:', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })

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
