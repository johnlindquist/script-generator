import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../auth/[...nextauth]/route'
import { cleanCodeFences } from '@/lib/generation'
import { logInteraction } from '@/lib/interaction-logger'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { streamText } from 'ai'
import { DRAFT_PASS_PROMPT } from './prompt'
import {
  createOpenRouterWithReasoning,
  enhancePromptWithReasoningRequest,
} from '@/lib/reasoning-extractor'

// Explicitly declare this route uses Node.js runtime
export const runtime = 'nodejs'

const DAILY_LIMIT = 24
const CLI_API_KEY = process.env.CLI_API_KEY
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const DEFAULT_MODEL = process.env.OPENROUTER_DEFAULT_MODEL

export async function POST(req: Request) {
  const requestId = Math.random().toString(36).slice(2, 7)
  const session = await getServerSession(authOptions)

  // Get user info from request
  let userId = req.headers.get('X-CLI-API-Key') ? 'cli-user' : undefined

  // Check for web user if not CLI
  if (!userId) {
    if (!session?.user?.id) {
      console.error('[OpenRouter API] No user ID found:', { requestId })
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

  console.log('[OpenRouter API] User info for prompt:', {
    requestId,
    userId,
    isCLI: userId === 'cli-user',
    userInfo,
  })

  try {
    const interactionTimestamp = req.headers.get('Interaction-Timestamp') || 'unknown'
    logInteraction(interactionTimestamp, 'serverRoute', 'Started /api/generate-openrouter route', {
      requestId,
    })

    // Check for CLI API key first
    const apiKey = req.headers.get('X-CLI-API-Key')?.toLowerCase()
    const expectedApiKey = CLI_API_KEY?.toLowerCase()

    if (apiKey && expectedApiKey && apiKey === expectedApiKey) {
      // Skip auth for CLI tools with valid API key
      logInteraction(interactionTimestamp, 'serverRoute', 'CLI API key auth successful', {
        requestId,
      })
      userId = 'cli-user' // Use a special ID for CLI requests
    } else {
      // Fall back to session auth for web requests
      if (!session?.user) {
        return new NextResponse('Unauthorized', { status: 401 })
      }
      userId = session.user.id
    }

    const body = await req.json().catch(() => ({}))
    const { prompt, luckyRequestId, extractReasoning } = body

    console.log('[OpenRouter API] Request details:', {
      requestId,
      luckyRequestId,
      hasPrompt: !!prompt,
      hasTimestamp: !!interactionTimestamp,
      userId: userId,
      source: luckyRequestId ? 'lucky' : 'direct',
      extractReasoning: !!extractReasoning,
    })

    if (!interactionTimestamp) {
      console.error('[OpenRouter API] Missing interaction timestamp:', {
        requestId,
      })
      return NextResponse.json({ error: 'Missing interaction timestamp' }, { status: 400 })
    }

    if (!prompt) {
      console.error('[OpenRouter API] Missing prompt:', { requestId })
      logInteraction(interactionTimestamp, 'serverRoute', 'Missing prompt', {
        requestId,
      })
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
    }

    // Check for OpenRouter API key
    if (!OPENROUTER_API_KEY) {
      console.error('[OpenRouter API] Missing OpenRouter API key:', { requestId })
      logInteraction(interactionTimestamp, 'serverRoute', 'Missing OpenRouter API key', {
        requestId,
      })
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 })
    }

    // Check for OpenRouter model
    if (!DEFAULT_MODEL) {
      console.error('[OpenRouter API] Missing OpenRouter model:', { requestId })
      logInteraction(interactionTimestamp, 'serverRoute', 'Missing OpenRouter model', {
        requestId,
      })
      return NextResponse.json({ error: 'OpenRouter model not configured' }, { status: 500 })
    }

    console.log('[OpenRouter API] Checking user usage:', {
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
        count: usage.count + 1,
      },
    })

    // Generate draft script using OpenRouter
    let draftPrompt = DRAFT_PASS_PROMPT.replace('{prompt}', prompt).replace(
      '{userInfo}',
      JSON.stringify(userInfo)
    )

    // If reasoning extraction is requested, enhance the prompt
    if (extractReasoning) {
      draftPrompt = enhancePromptWithReasoningRequest(draftPrompt)
    }

    console.log('[OpenRouter API] Starting draft generation:', {
      requestId,
      prompt,
      source: luckyRequestId ? 'lucky' : 'direct',
      model: DEFAULT_MODEL,
      extractReasoning: !!extractReasoning,
    })

    // Initialize the model based on whether reasoning extraction is requested
    let result
    if (extractReasoning && OPENROUTER_API_KEY) {
      // Use the utility function to create a model with reasoning extraction
      const modelWithReasoning = createOpenRouterWithReasoning(OPENROUTER_API_KEY, DEFAULT_MODEL)

      result = await streamText({
        model: modelWithReasoning,
        prompt: draftPrompt,
      })
    } else {
      // Create standard OpenRouter instance without reasoning extraction
      const openrouter = createOpenRouter({
        apiKey: OPENROUTER_API_KEY || '',
      })

      result = await streamText({
        model: openrouter(DEFAULT_MODEL),
        prompt: draftPrompt,
      })
    }

    console.log('[OpenRouter API] Using script ID:', { requestId, scriptId })

    // Create a new stream response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('[OpenRouter API] Starting stream:', { requestId, scriptId })
          controller.enqueue(new TextEncoder().encode(`__SCRIPT_ID__${scriptId}__SCRIPT_ID__`))

          try {
            // Use textStream property which is the correct way to access the stream
            for await (const chunk of result.textStream) {
              const text = cleanCodeFences(chunk || '')
              console.log('[OpenRouter API] Streaming chunk:', {
                requestId,
                scriptId,
                chunkSize: text.length,
                preview: text.length > 0 ? text.substring(0, 50) : '(no text)',
              })
              controller.enqueue(new TextEncoder().encode(text))
            }

            // If reasoning was extracted, log it
            if (extractReasoning && result.reasoning) {
              // Await the reasoning Promise to get the actual string value
              const reasoningText = await result.reasoning

              if (reasoningText) {
                console.log('[OpenRouter API] Extracted reasoning:', {
                  requestId,
                  scriptId,
                  reasoningLength: reasoningText.length,
                  reasoningPreview: reasoningText.substring(0, 100) + '...',
                })

                // Store the reasoning in the database using an available field
                await prisma.script.update({
                  where: { id: scriptId },
                  data: {
                    summary: `Reasoning: ${reasoningText.substring(0, 200)}...`,
                  },
                })
              }
            }

            console.log('[OpenRouter API] Stream completed:', { requestId, scriptId })
          } catch (error) {
            console.error('[OpenRouter API] Error in stream:', {
              requestId,
              scriptId,
              error: error instanceof Error ? error.message : String(error),
            })
            controller.error(error)
          }
        } catch (error) {
          console.error('[OpenRouter API] Error in stream start:', {
            requestId,
            scriptId,
            error: error instanceof Error ? error.message : String(error),
          })
          controller.error(error)
        } finally {
          controller.close()
        }
      },
    })

    // Return the stream response
    return new Response(stream)
  } catch (error) {
    console.error('[OpenRouter API] Unhandled error:', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
