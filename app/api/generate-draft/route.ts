import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../auth/[...nextauth]/route'
import { model } from '@/lib/gemini'
import { cleanCodeFences } from '@/lib/generation'
import { logInteraction } from '@/lib/interaction-logger'
import { DRAFT_PASS_PROMPT } from './prompt'

// Explicitly declare this route uses Node.js runtime
export const runtime = 'nodejs'

const DAILY_LIMIT = 24
const CLI_API_KEY = process.env.CLI_API_KEY

export async function POST(req: Request) {
  const requestId = Math.random().toString(36).slice(2, 7)
  const session = await getServerSession(authOptions)

  // Get user info from request
  let userId = req.headers.get('X-CLI-API-Key') ? 'cli-user' : undefined

  // Check for web user if not CLI
  if (!userId) {
    if (!session?.user?.id) {
      console.error('[API Route] No user ID found:', { requestId })
      return new Response('Unauthorized', { status: 401 })
    }
    userId = session.user.id
  }

  // Get user info without relying on session
  const userInfo =
    userId === 'cli-user'
      ? { type: 'cli', id: userId, username: 'CLI Tool' }
      : {
          type: 'web',
          id: userId,
          username: session?.user?.username || 'Unknown',
        }

  console.log('[API Route] User info for prompt:', {
    requestId,
    userId,
    isCLI: userId === 'cli-user',
    userInfo,
  })

  try {
    const interactionTimestamp = req.headers.get('Interaction-Timestamp') || 'unknown'
    logInteraction(interactionTimestamp, 'serverRoute', 'Started /api/generate-draft route', {
      requestId,
    })

    // Check for CLI API key first
    const apiKey = req.headers.get('X-CLI-API-Key')?.toLowerCase()
    const expectedApiKey = CLI_API_KEY?.toLowerCase()

    console.log('[API Route] Auth details:', {
      requestId,
      apiKey,
      expectedApiKey,
      headers: Object.fromEntries(req.headers.entries()),
    })

    if (apiKey && expectedApiKey && apiKey === expectedApiKey) {
      // Skip auth for CLI tools with valid API key
      logInteraction(interactionTimestamp, 'serverRoute', 'CLI API key auth successful', {
        requestId,
      })
      userId = 'cli-user' // Use a special ID for CLI requests
    } else {
      console.log('[API Route] API key mismatch:', {
        requestId,
        receivedKey: apiKey,
        expectedKey: CLI_API_KEY,
      })
      // Fall back to session auth for web requests
      if (!session?.user) {
        return new NextResponse('Unauthorized', { status: 401 })
      }
      userId = session.user.id
    }

    const body = await req.json().catch(() => ({}))
    const { prompt, luckyRequestId } = body

    console.log('[API Route] Request details:', {
      requestId,
      luckyRequestId,
      hasPrompt: !!prompt,
      hasTimestamp: !!interactionTimestamp,
      userId: userId,
      source: luckyRequestId ? 'lucky' : 'direct',
    })

    if (!interactionTimestamp) {
      console.error('[API Route] Missing interaction timestamp:', {
        requestId,
      })
      return NextResponse.json({ error: 'Missing interaction timestamp' }, { status: 400 })
    }

    logInteraction(interactionTimestamp, 'serverRoute', 'Started /api/generate-draft route', {
      requestId,
      luckyRequestId,
      source: luckyRequestId ? 'lucky' : 'direct',
    })

    if (!prompt) {
      console.error('[API Route] Missing prompt:', { requestId })
      logInteraction(interactionTimestamp, 'serverRoute', 'Missing prompt', {
        requestId,
      })
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
    }

    console.log('[API Route] Checking user usage:', {
      requestId,
      userId: userId,
      source: luckyRequestId ? 'lucky' : 'direct',
    })

    // Create a new script record and store the ID for later use
    const { id: scriptId } = await prisma.script.create({
      data: {
        title: 'Draft Script',
        content: '',
        summary: '',
        ownerId: userId,
        prompt,
      },
      select: {
        id: true,
      },
    })

    // Get or create usage record for today
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        usage: {
          where: {
            date: now,
          },
        },
      },
    })

    if (!dbUser) {
      // Create a new user if it doesn't exist (for CLI usage)
      await prisma.user.create({
        data: {
          id: userId,
          username: userId === 'cli-user' ? 'CLI Tool' : 'Unknown',
          usage: {
            create: {
              date: now,
              count: 0,
            },
          },
        },
      })
    }

    let usage = await prisma.usage.findUnique({
      where: {
        userId_date: {
          userId: userId,
          date: now,
        },
      },
    })

    if (!usage) {
      usage = await prisma.usage.create({
        data: {
          userId: userId,
          date: now,
          count: 0,
        },
      })
    }

    // Check if user has exceeded daily limit
    if (usage.count >= DAILY_LIMIT) {
      return new NextResponse('Daily limit exceeded', { status: 429 })
    }

    // Increment usage count
    await prisma.usage.update({
      where: {
        userId_date: {
          userId: userId,
          date: now,
        },
      },
      data: {
        count: { increment: 1 },
      },
    })

    // Generate draft script using Gemini
    const draftPrompt = DRAFT_PASS_PROMPT.replace('{prompt}', prompt).replace(
      '{userInfo}',
      JSON.stringify(userInfo)
    )

    console.log('[API Route] Starting draft generation:', {
      requestId,
      prompt,
      source: luckyRequestId ? 'lucky' : 'direct',
    })

    const result = await model.generateContentStream(draftPrompt)

    let aborted = false
    // Using the scriptId from the DB record for client compatibility
    console.log('[API Route] Using script ID:', { requestId, scriptId })

    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('[API Route] Starting stream:', { requestId, scriptId })
          controller.enqueue(new TextEncoder().encode(`__SCRIPT_ID__${scriptId}__SCRIPT_ID__`))

          try {
            for await (const chunk of result.stream) {
              if (aborted) {
                console.log('[API Route] Generation aborted:', {
                  requestId,
                  scriptId,
                })
                break
              }
              const text = cleanCodeFences(chunk.text())
              console.log('[API Route] Streaming chunk:', {
                requestId,
                scriptId,
                chunkSize: text.length,
                preview: text.length > 0 ? text : '(no text)',
              })
              controller.enqueue(new TextEncoder().encode(text))
            }
          } catch (streamError) {
            if (streamError instanceof Error && streamError.name === 'AbortError') {
              console.log('[API Route] Stream aborted:', {
                requestId,
                scriptId,
              })
              aborted = true
              return
            }
            throw streamError
          }

          if (!aborted) {
            console.log('[API Route] Draft generation completed:', {
              requestId,
              scriptId,
            })
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

    console.log('[API Route] Returning stream response:', {
      requestId,
      scriptId,
    })
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
