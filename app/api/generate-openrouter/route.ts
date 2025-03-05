export const maxDuration = 180

import fs from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../auth/[...nextauth]/route'
import { cleanCodeFences } from '@/lib/generation'
import { logInteraction } from '@/lib/interaction-logger'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { streamText } from 'ai'
import { DRAFT_PASS_PROMPT } from './prompt'
import { enhancePromptWithReasoningRequest } from '@/lib/reasoning-extractor'

// Explicitly declare this route uses Node.js runtime
export const runtime = 'nodejs'

const DAILY_LIMIT = 24
const CLI_API_KEY = process.env.CLI_API_KEY
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const DEFAULT_MODEL = process.env.OPENROUTER_DEFAULT_MODEL
const FALLBACK_MODEL = process.env.OPENROUTER_FALLBACK_MODEL

// Define path for storing raw generated scripts
const GENERATED_DIR = path.join(process.cwd(), 'generated')

// Ensure the generated directory exists
function ensureGeneratedDir() {
  if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true })
  }
}

// Function to write raw script to file with timestamp
function saveRawGeneratedScript(scriptId: string, content: string) {
  try {
    ensureGeneratedDir()

    // Create a timestamp for the filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${timestamp}__${scriptId}.ts`
    const filepath = path.join(GENERATED_DIR, filename)

    // Write content to file
    fs.writeFileSync(filepath, content, 'utf-8')

    console.log(`[OpenRouter API] Saved raw generated script to: ${filepath}`)

    return filepath
  } catch (error) {
    console.error('[OpenRouter API] Failed to save raw generated script:', {
      error: error instanceof Error ? error.message : String(error),
      scriptId,
    })
    return null
  }
}

// Log environment variables for debugging
console.log('[OpenRouter API] Environment configuration:', {
  OPENROUTER_API_KEY_SET: !!OPENROUTER_API_KEY,
  OPENROUTER_DEFAULT_MODEL: DEFAULT_MODEL, // Intentionally exposing model for debugging
  OPENROUTER_FALLBACK_MODEL: FALLBACK_MODEL,
  environment: process.env.NODE_ENV,
  timestamp: new Date().toISOString(),
})

// In-memory cache to track in-flight requests
// This will be reset when the serverless function is recycled
const inFlightRequests = new Map<string, boolean>()

// Helper to clean up in-flight requests after a timeout
// const cleanupInFlightRequest = (key: string, timeoutMs = 30000) => {
//   setTimeout(() => {
//     inFlightRequests.delete(key)
//     console.log(`[OpenRouter API] Cleaned up in-flight request: ${key}`)
//   }, timeoutMs)
// }

export async function POST(req: Request) {
  const requestId = Math.random().toString(36).slice(2, 7)
  const session = await getServerSession(authOptions)
  let uniqueKey: string | null = null

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

    // Implement idempotency check using a unique key based on user, prompt, and timestamp
    uniqueKey = `${userId}-${prompt.substring(0, 50)}-${interactionTimestamp}`

    if (inFlightRequests.has(uniqueKey)) {
      console.warn('[OpenRouter API] Duplicate request detected:', {
        requestId,
        uniqueKey,
        userId,
      })
      await logInteraction(interactionTimestamp, 'serverRoute', 'Duplicate request rejected', {
        requestId,
        uniqueKey,
      })
      return NextResponse.json(
        { error: 'A similar request is already being processed' },
        { status: 429 }
      )
    }

    // Mark this request as in-flight
    inFlightRequests.set(uniqueKey, true)
    console.log('[OpenRouter API] Request marked as in-flight:', { uniqueKey })

    // We'll clean up at the end of the request instead of using a timeout
    // This ensures we don't have lingering in-flight requests

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
        count: { increment: 1 },
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
      timestamp: new Date().toISOString(),
      modelConfigCheck: {
        modelValue: DEFAULT_MODEL,
        isModelConfigured: !!DEFAULT_MODEL,
        apiKeyConfigured: !!OPENROUTER_API_KEY,
      },
    })

    // Initialize the model based on whether reasoning extraction is requested
    let result: ReturnType<typeof streamText> | undefined
    try {
      console.log('[OpenRouter API] Creating standard OpenRouter instance:', {
        requestId,
        model: DEFAULT_MODEL,
        timestamp: new Date().toISOString(),
      })

      const openrouter = createOpenRouter({
        apiKey: OPENROUTER_API_KEY || '',
      })

      // Verify the model value before using it
      if (!DEFAULT_MODEL) {
        throw new Error('OpenRouter model not properly configured')
      }

      result = streamText({
        model: openrouter(DEFAULT_MODEL),
        prompt: draftPrompt,
      })

      console.log('[OpenRouter API] Stream result object created successfully:', {
        requestId,
        hasTextStream: !!result?.textStream,
        timestamp: new Date().toISOString(),
      })
    } catch (modelError) {
      console.error('[OpenRouter API] Error creating or using OpenRouter model:', {
        requestId,
        error: modelError instanceof Error ? modelError.message : String(modelError),
        stack: modelError instanceof Error ? modelError.stack : 'No stack trace',
        model: DEFAULT_MODEL,
        timestamp: new Date().toISOString(),
      })
      throw modelError // Re-throw to be handled by the outer catch block
    }

    console.log('[OpenRouter API] Using script ID:', { requestId, scriptId })

    // Create a new stream response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('[OpenRouter API] Starting stream:', {
            requestId,
            scriptId,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
          })

          // First, send the script ID
          const scriptIdText = `__SCRIPT_ID__${scriptId}__SCRIPT_ID__`
          controller.enqueue(new TextEncoder().encode(scriptIdText))

          console.log('[OpenRouter API] Sent script ID to stream:', {
            requestId,
            scriptId,
            scriptIdTextLength: scriptIdText.length,
            timestamp: new Date().toISOString(),
          })

          try {
            // Debug the result object
            console.log('[OpenRouter API] Result object structure:', {
              requestId,
              hasTextStream: result?.textStream ? true : false,
              isAsyncIterable:
                result?.textStream && typeof result.textStream[Symbol.asyncIterator] === 'function',
              hasReasoning: (await result?.reasoning) ? true : false,
              timestamp: new Date().toISOString(),
            })

            let chunkCount = 0
            let totalSentBytes = 0

            // Variable to accumulate raw content for debugging
            let rawScriptContent = ''

            // Use textStream property which is the correct way to access the stream
            if (!result?.textStream) {
              throw new Error('No text stream available from model result')
            }

            for await (const chunk of result.textStream) {
              chunkCount++

              // Skip empty chunks
              if (!chunk) {
                console.log('[OpenRouter API] Empty chunk received, skipping', {
                  requestId,
                  scriptId,
                  chunkNumber: chunkCount,
                  timestamp: new Date().toISOString(),
                })
                continue
              }

              // Preserve whitespace chunks (including newlines)
              // Check if chunk is just whitespace (spaces, tabs, newlines)
              const isWhitespaceOnly = /^[\s\n\r]+$/.test(chunk)

              // Apply cleanCodeFences to non-whitespace chunks only
              const text = isWhitespaceOnly ? chunk : cleanCodeFences(chunk || '')

              // Skip truly empty chunks after processing
              if (!text) {
                console.log('[OpenRouter API] Chunk became empty after processing, skipping', {
                  requestId,
                  scriptId,
                  chunkNumber: chunkCount,
                  originalChunkLength: chunk.length,
                  timestamp: new Date().toISOString(),
                })
                continue
              }

              const encodedChunk = new TextEncoder().encode(text)
              totalSentBytes += encodedChunk.byteLength

              console.log('[OpenRouter API] Streaming chunk:', {
                requestId,
                scriptId,
                chunkNumber: chunkCount,
                chunkSize: text.length,
                totalSentBytes,
                isWhitespace: isWhitespaceOnly,
                preview: text.substring(0, 50).replace(/\n/g, '\\n'),
                timestamp: new Date().toISOString(),
              })

              // Send the chunk to the client
              controller.enqueue(encodedChunk)

              // Accumulate the raw script content for debugging
              rawScriptContent += text

              // Add a small delay to ensure browser can process chunks (helps with some streaming issues)
              await new Promise(resolve => setTimeout(resolve, 5))
            }

            console.log('[OpenRouter API] Stream iteration completed:', {
              requestId,
              scriptId,
              totalChunks: chunkCount,
              totalSentBytes,
              timestamp: new Date().toISOString(),
            })

            // If reasoning was extracted, log it
            if (extractReasoning && result?.reasoning) {
              // Await the reasoning Promise to get the actual string value
              const reasoningText = await result.reasoning

              if (reasoningText) {
                console.log('[OpenRouter API] Extracted reasoning:', {
                  requestId,
                  scriptId,
                  reasoningLength: reasoningText.length,
                  reasoningPreview: reasoningText.substring(0, 100) + '...',
                  timestamp: new Date().toISOString(),
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

            // Save the raw generated script content to file for debugging
            const rawScriptPath = saveRawGeneratedScript(scriptId, rawScriptContent)

            if (rawScriptPath) {
              console.log('[OpenRouter API] Raw script saved to:', {
                requestId,
                scriptId,
                rawScriptPath,
                timestamp: new Date().toISOString(),
              })
            }

            console.log('[OpenRouter API] Stream completed successfully:', {
              requestId,
              scriptId,
              timestamp: new Date().toISOString(),
            })
          } catch (error) {
            console.error('[OpenRouter API] Error in stream processing:', {
              requestId,
              scriptId,
              errorMessage: error instanceof Error ? error.message : String(error),
              errorStack: error instanceof Error ? error.stack : undefined,
              timestamp: new Date().toISOString(),
            })

            // Don't throw the error here - just log it and continue
            // This prevents the stream from aborting if we can recover

            // Send an error message to the client if we have a connection
            try {
              const errorMessage = `Error during generation: ${error instanceof Error ? error.message : String(error)}`
              controller.enqueue(new TextEncoder().encode(`\n\nERROR: ${errorMessage}`))
            } catch (sendError) {
              console.error('[OpenRouter API] Failed to send error message to client:', {
                requestId,
                scriptId,
                error: sendError instanceof Error ? sendError.message : String(sendError),
                timestamp: new Date().toISOString(),
              })
            }
          }
        } catch (error) {
          console.error('[OpenRouter API] Fatal error in stream start:', {
            requestId,
            scriptId,
            errorMessage: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
          })
          controller.error(error)
        } finally {
          try {
            console.log('[OpenRouter API] Closing controller in finally block:', {
              requestId,
              scriptId,
              timestamp: new Date().toISOString(),
            })
            controller.close()
          } catch (closeError) {
            console.error('[OpenRouter API] Error closing controller:', {
              requestId,
              scriptId,
              error: closeError instanceof Error ? closeError.message : String(closeError),
              timestamp: new Date().toISOString(),
            })
          }
        }
      },
    })

    // Return the stream response
    return new Response(stream)
  } catch (error) {
    console.error('[OpenRouter API] Error in generate-openrouter route:', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })

    // Clean up the in-flight request on error
    if (uniqueKey) {
      inFlightRequests.delete(uniqueKey)
      console.log('[OpenRouter API] Cleaned up in-flight request on error:', { uniqueKey })
    }

    return NextResponse.json(
      {
        error: 'Failed to generate script',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  } finally {
    // Ensure the in-flight request is cleaned up
    if (uniqueKey) {
      inFlightRequests.delete(uniqueKey)
      console.log('[OpenRouter API] Cleaned up in-flight request in finally block:', { uniqueKey })
    }
  }
}
