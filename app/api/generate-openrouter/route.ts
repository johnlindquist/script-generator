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
        hasFullStream: !!result?.fullStream,
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
        // Declare diagnostic timer at the outer scope so it can be cleared in any finally block
        let diagnosticTimer: NodeJS.Timeout | null = null

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

          // Wrap the rest of the processing in a try/catch to prevent errors from bubbling up
          try {
            console.log('[OpenRouter API] Starting debug section 1:', {
              requestId,
              scriptId,
              timestamp: new Date().toISOString(),
            })

            // Check if result exists before using it
            if (!result) {
              throw new Error('Stream result object is undefined')
            }

            // Checking if fullStream exists without accessing other properties first
            const hasFullStream = !!result.fullStream

            console.log('[OpenRouter API] Starting debug section 2:', {
              requestId,
              scriptId,
              hasFullStream,
              timestamp: new Date().toISOString(),
            })

            // Avoid accessing Symbol.asyncIterator directly as it might cause issues
            let isAsyncIterable = false
            if (hasFullStream) {
              try {
                // First check if Symbol.asyncIterator exists
                if (Symbol.asyncIterator) {
                  console.log('[OpenRouter API] AsyncIterator symbol exists:', {
                    requestId,
                    scriptId,
                    timestamp: new Date().toISOString(),
                  })

                  // Check if the result.fullStream object has the property
                  const hasSymbol = result.fullStream[Symbol.asyncIterator] !== undefined

                  console.log('[OpenRouter API] fullStream has AsyncIterator symbol:', {
                    requestId,
                    scriptId,
                    hasSymbol,
                    timestamp: new Date().toISOString(),
                  })

                  if (hasSymbol) {
                    // Finally check if it's a function
                    isAsyncIterable = typeof result.fullStream[Symbol.asyncIterator] === 'function'

                    console.log('[OpenRouter API] AsyncIterator is a function:', {
                      requestId,
                      scriptId,
                      isAsyncIterable,
                      timestamp: new Date().toISOString(),
                    })
                  }
                } else {
                  console.log('[OpenRouter API] AsyncIterator symbol not supported:', {
                    requestId,
                    scriptId,
                    timestamp: new Date().toISOString(),
                  })
                }
              } catch (asyncIterableError) {
                console.error('[OpenRouter API] Error checking asyncIterator:', {
                  requestId,
                  scriptId,
                  error:
                    asyncIterableError instanceof Error
                      ? asyncIterableError.message
                      : String(asyncIterableError),
                  timestamp: new Date().toISOString(),
                })
              }
            }

            console.log('[OpenRouter API] Starting debug section 3:', {
              requestId,
              scriptId,
              hasFullStream,
              isAsyncIterable,
              timestamp: new Date().toISOString(),
            })

            console.log('[OpenRouter API] Before reasoning check:', {
              requestId,
              scriptId,
              extractReasoningFlag: !!extractReasoning,
              timestamp: new Date().toISOString(),
            })

            // Safe check for reasoning property - only if explicitly requested
            let hasReasoning = false

            // Skip the reasoning check entirely if not requested
            if (!extractReasoning) {
              console.log('[OpenRouter API] Skipping reasoning check - not requested:', {
                requestId,
                scriptId,
                timestamp: new Date().toISOString(),
              })
            } else {
              try {
                // Check if reasoning exists using hasOwnProperty to avoid accessing the property directly
                const hasReasoningProperty = Object.prototype.hasOwnProperty.call(
                  result,
                  'reasoning'
                )

                console.log('[OpenRouter API] Reasoning property check:', {
                  requestId,
                  scriptId,
                  hasReasoningProperty,
                  timestamp: new Date().toISOString(),
                })

                if (hasReasoningProperty) {
                  // Extremely cautious approach to check reasoning
                  try {
                    // First just check if it's truthy without awaiting
                    const reasoningExists = Boolean(result.reasoning)

                    console.log('[OpenRouter API] Reasoning exists check:', {
                      requestId,
                      scriptId,
                      reasoningExists,
                      timestamp: new Date().toISOString(),
                    })

                    if (reasoningExists) {
                      // Now try to await it
                      console.log('[OpenRouter API] Before awaiting reasoning:', {
                        requestId,
                        scriptId,
                        timestamp: new Date().toISOString(),
                      })

                      // Use a timeout promise to prevent hanging
                      const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Reasoning promise timed out')), 5000)
                      })

                      try {
                        // Race the reasoning promise against a timeout
                        const resolvedReasoning = await Promise.race([
                          Promise.resolve(result.reasoning).catch(() => null),
                          timeoutPromise,
                        ])

                        hasReasoning = !!resolvedReasoning

                        console.log('[OpenRouter API] After awaiting reasoning:', {
                          requestId,
                          scriptId,
                          hasReasoning,
                          timestamp: new Date().toISOString(),
                        })
                      } catch (timeoutError) {
                        console.error('[OpenRouter API] Timeout awaiting reasoning:', {
                          requestId,
                          scriptId,
                          error:
                            timeoutError instanceof Error
                              ? timeoutError.message
                              : String(timeoutError),
                          timestamp: new Date().toISOString(),
                        })
                      }
                    }
                  } catch (reasoningCheckError) {
                    console.error('[OpenRouter API] Error checking if reasoning exists:', {
                      requestId,
                      scriptId,
                      error:
                        reasoningCheckError instanceof Error
                          ? reasoningCheckError.message
                          : String(reasoningCheckError),
                      timestamp: new Date().toISOString(),
                    })
                  }
                } else {
                  console.log('[OpenRouter API] No reasoning property found:', {
                    requestId,
                    scriptId,
                    timestamp: new Date().toISOString(),
                  })
                }
              } catch (reasoningError) {
                console.error('[OpenRouter API] Error in reasoning property check:', {
                  requestId,
                  scriptId,
                  error:
                    reasoningError instanceof Error
                      ? reasoningError.message
                      : String(reasoningError),
                  timestamp: new Date().toISOString(),
                })
              }
            }

            console.log('[OpenRouter API] After reasoning check:', {
              requestId,
              scriptId,
              hasReasoning,
              timestamp: new Date().toISOString(),
            })

            // Debug the result object with safer property access
            console.log('[OpenRouter API] Result object structure:', {
              requestId,
              hasFullStream,
              isAsyncIterable,
              hasReasoning,
              timestamp: new Date().toISOString(),
            })

            let chunkCount = 0
            let totalSentBytes = 0

            // Variable to accumulate raw content for debugging
            let rawScriptContent = ''

            // Keep track of the last chunk to check for missing newlines
            let lastChunk = ''

            // Add diagnostic logging before entering the stream loop
            console.log('[OpenRouter API] About to enter streaming loop:', {
              requestId,
              scriptId,
              timestamp: new Date().toISOString(),
            })

            // Set up a diagnostic timer to log if we're waiting too long for chunks
            diagnosticTimer = setInterval(() => {
              console.log('[OpenRouter API] Still waiting for chunks:', {
                requestId,
                scriptId,
                chunkCount,
                totalSentBytes,
                timestamp: new Date().toISOString(),
              })
            }, 5000) // Log every 5 seconds

            // Check for stream availability before entering the loop
            if (!hasFullStream || !isAsyncIterable) {
              throw new Error(
                `No valid stream available: hasFullStream=${hasFullStream}, isAsyncIterable=${isAsyncIterable}`
              )
            }

            try {
              console.log('[OpenRouter API] Getting async iterator:', {
                requestId,
                scriptId,
                timestamp: new Date().toISOString(),
              })

              // First get the iterator explicitly to diagnose any issues
              let iterator
              try {
                iterator = result.fullStream[Symbol.asyncIterator]()

                console.log('[OpenRouter API] Successfully got iterator:', {
                  requestId,
                  scriptId,
                  hasIterator: !!iterator,
                  timestamp: new Date().toISOString(),
                })
              } catch (iteratorError) {
                console.error('[OpenRouter API] Error getting iterator:', {
                  requestId,
                  scriptId,
                  error:
                    iteratorError instanceof Error ? iteratorError.message : String(iteratorError),
                  timestamp: new Date().toISOString(),
                })
                throw iteratorError
              }

              console.log('[OpenRouter API] Starting manual iteration:', {
                requestId,
                scriptId,
                timestamp: new Date().toISOString(),
              })

              // Try to get the first value manually instead of using for-await
              try {
                console.log('[OpenRouter API] Awaiting first next() call:', {
                  requestId,
                  scriptId,
                  timestamp: new Date().toISOString(),
                })

                // Use a timeout to prevent hanging
                const timeoutPromise = new Promise<never>((_, reject) => {
                  setTimeout(() => reject(new Error('Iterator next() timed out')), 10000)
                })

                const firstResult = await Promise.race([iterator.next(), timeoutPromise])

                console.log('[OpenRouter API] First iteration result:', {
                  requestId,
                  scriptId,
                  isDone: firstResult.done,
                  hasValue: firstResult.value !== undefined,
                  timestamp: new Date().toISOString(),
                })

                // Process the first value if it exists
                if (!firstResult.done && firstResult.value) {
                  console.log('[OpenRouter API] Processing first chunk:', {
                    requestId,
                    scriptId,
                    chunkType: firstResult.value.type,
                    timestamp: new Date().toISOString(),
                  })

                  // Clear the diagnostic timer on first chunk
                  if (diagnosticTimer) {
                    clearInterval(diagnosticTimer)
                    diagnosticTimer = null
                    console.log('[OpenRouter API] Received first chunk:', {
                      requestId,
                      scriptId,
                      timestamp: new Date().toISOString(),
                    })
                  }

                  // Process this chunk like we would in the for-await loop
                  const chunk = firstResult.value
                  chunkCount++

                  // Now process the chunk as normal...
                  if (!chunk) {
                    console.log('[OpenRouter API] Empty chunk received, skipping', {
                      requestId,
                      scriptId,
                      chunkNumber: chunkCount,
                      timestamp: new Date().toISOString(),
                    })
                  } else if (chunk.type === 'error') {
                    console.error('[OpenRouter API] Error in stream:', {
                      requestId,
                      error: chunk.error,
                    })
                  } else if (chunk.type === 'finish' || chunk.type === 'step-finish') {
                    console.log(
                      `[OpenRouter API] ${chunk.type === 'finish' ? 'Finish' : 'Step finished'}:`,
                      {
                        requestId,
                        result: chunk.finishReason,
                      }
                    )
                  } else if (chunk.type === 'reasoning') {
                    console.log('[OpenRouter API] Reasoning:', {
                      requestId,
                      result: chunk.textDelta,
                    })
                  } else if (chunk.type === 'text-delta') {
                    // Process the text chunk as usual...
                    const isWhitespaceOnly = /^[\s\n\r]+$/.test(chunk.textDelta)
                    const text = isWhitespaceOnly
                      ? chunk.textDelta
                      : cleanCodeFences(chunk.textDelta || '')

                    if (!text) {
                      console.log(
                        '[OpenRouter API] Chunk became empty after processing, skipping',
                        {
                          requestId,
                          scriptId,
                          chunkNumber: chunkCount,
                          originalChunkLength: chunk.textDelta.length,
                          timestamp: new Date().toISOString(),
                        }
                      )
                    } else {
                      // Process and send the text as usual
                      let processedText = text
                      if (
                        (text.startsWith('const ') || text.startsWith('// ')) &&
                        lastChunk &&
                        !lastChunk.endsWith('\n')
                      ) {
                        processedText = '\n' + text
                      }

                      lastChunk = text
                      const encodedChunk = new TextEncoder().encode(processedText)
                      totalSentBytes += encodedChunk.byteLength

                      console.log('[OpenRouter API] Streaming chunk:', {
                        requestId,
                        scriptId,
                        chunkNumber: chunkCount,
                        chunkSize: processedText.length,
                        totalSentBytes,
                        isWhitespace: isWhitespaceOnly,
                        preview: processedText.substring(0, 50).replace(/\n/g, '\\n'),
                        timestamp: new Date().toISOString(),
                      })

                      controller.enqueue(encodedChunk)
                      rawScriptContent += processedText
                    }
                  }

                  console.log('[OpenRouter API] First chunk processed successfully:', {
                    requestId,
                    scriptId,
                    timestamp: new Date().toISOString(),
                  })
                }
              } catch (iterationError) {
                console.error('[OpenRouter API] Error in first iteration:', {
                  requestId,
                  scriptId,
                  error:
                    iterationError instanceof Error
                      ? iterationError.message
                      : String(iterationError),
                  stack: iterationError instanceof Error ? iterationError.stack : undefined,
                  timestamp: new Date().toISOString(),
                })
                throw iterationError
              }

              // Now continue with the normal for-await loop for remaining chunks
              console.log(
                '[OpenRouter API] Switching to standard for-await loop for remaining chunks:',
                {
                  requestId,
                  scriptId,
                  timestamp: new Date().toISOString(),
                }
              )

              for await (const chunk of result.fullStream) {
                // Clear the diagnostic timer on first chunk
                if (chunkCount === 0 && diagnosticTimer) {
                  clearInterval(diagnosticTimer)
                  diagnosticTimer = null
                  console.log('[OpenRouter API] Received first chunk:', {
                    requestId,
                    scriptId,
                    timestamp: new Date().toISOString(),
                  })
                }

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

                if (chunk.type === 'error') {
                  console.error('[OpenRouter API] Error in stream:', {
                    requestId,
                    error: chunk.error,
                  })
                  continue
                }

                if (chunk.type === 'finish') {
                  console.log('[OpenRouter API] Finish:', {
                    requestId,
                    result: chunk.finishReason,
                  })
                  continue
                }

                if (chunk.type === 'step-finish') {
                  console.log('[OpenRouter API] Step finished:', {
                    requestId,
                    result: chunk.finishReason,
                  })
                  continue
                }

                if (chunk.type === 'reasoning') {
                  console.log('[OpenRouter API] Reasoning:', {
                    requestId,
                    result: chunk.textDelta,
                  })
                  continue
                }

                if (chunk.type === 'text-delta') {
                  // Preserve whitespace chunks (including newlines)
                  // Check if chunk is just whitespace (spaces, tabs, newlines)
                  const isWhitespaceOnly = /^[\s\n\r]+$/.test(chunk.textDelta)

                  // Apply cleanCodeFences to non-whitespace chunks only
                  const text = isWhitespaceOnly
                    ? chunk.textDelta
                    : cleanCodeFences(chunk.textDelta || '')

                  // Skip truly empty chunks after processing
                  if (!text) {
                    console.log('[OpenRouter API] Chunk became empty after processing, skipping', {
                      requestId,
                      scriptId,
                      chunkNumber: chunkCount,
                      originalChunkLength: chunk.textDelta.length,
                      timestamp: new Date().toISOString(),
                    })
                    continue
                  }

                  // Check if the current chunk starts with code pattern indicators
                  // and ensure a preceding newline if needed
                  let processedText = text
                  if (
                    (text.startsWith('const ') || text.startsWith('// ')) &&
                    lastChunk &&
                    !lastChunk.endsWith('\n')
                  ) {
                    console.log('[OpenRouter API] Adding missing newline before code pattern', {
                      requestId,
                      scriptId,
                      chunkNumber: chunkCount,
                      patternDetected: text.substring(0, 10),
                      timestamp: new Date().toISOString(),
                    })
                    processedText = '\n' + text
                  }

                  // Update lastChunk for next iteration
                  lastChunk = text

                  const encodedChunk = new TextEncoder().encode(processedText)
                  totalSentBytes += encodedChunk.byteLength

                  console.log('[OpenRouter API] Streaming chunk:', {
                    requestId,
                    scriptId,
                    chunkNumber: chunkCount,
                    chunkSize: processedText.length,
                    totalSentBytes,
                    isWhitespace: isWhitespaceOnly,
                    preview: processedText.substring(0, 50).replace(/\n/g, '\\n'),
                    timestamp: new Date().toISOString(),
                  })

                  // Send the chunk to the client
                  controller.enqueue(encodedChunk)

                  // Accumulate the raw script content for debugging
                  rawScriptContent += processedText

                  // Add a small delay to ensure browser can process chunks (helps with some streaming issues)
                  await new Promise(resolve => setTimeout(resolve, 100))
                }

                console.log('[OpenRouter API] Stream iteration completed:', {
                  requestId,
                  scriptId,
                  totalChunks: chunkCount,
                  totalSentBytes,
                  timestamp: new Date().toISOString(),
                })
              }

              // Save the raw generated script content to file for debugging
              if (rawScriptContent) {
                const rawScriptPath = saveRawGeneratedScript(scriptId, rawScriptContent)
                if (rawScriptPath) {
                  console.log('[OpenRouter API] Raw script saved to:', {
                    requestId,
                    scriptId,
                    rawScriptPath,
                    timestamp: new Date().toISOString(),
                  })
                }
              }

              console.log('[OpenRouter API] Stream completed successfully:', {
                requestId,
                scriptId,
                timestamp: new Date().toISOString(),
              })
            } catch (streamError) {
              // Log the error but don't rethrow - this prevents the outer catch from executing
              console.error('[OpenRouter API] Error in stream processing:', {
                requestId,
                scriptId,
                errorMessage:
                  streamError instanceof Error ? streamError.message : String(streamError),
                errorStack: streamError instanceof Error ? streamError.stack : undefined,
                timestamp: new Date().toISOString(),
              })

              // Send an error message to the client if we have a connection
              try {
                const errorMessage = `Error during generation: ${streamError instanceof Error ? streamError.message : String(streamError)}`
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
          } catch (prepError) {
            // This handles errors in the preparation phase (before streaming starts)
            console.error('[OpenRouter API] Error in stream preparation:', {
              requestId,
              scriptId,
              errorMessage: prepError instanceof Error ? prepError.message : String(prepError),
              errorStack: prepError instanceof Error ? prepError.stack : undefined,
              timestamp: new Date().toISOString(),
            })

            // Try to send an error message to the client
            try {
              const errorMessage = `Preparation error: ${prepError instanceof Error ? prepError.message : String(prepError)}`
              controller.enqueue(new TextEncoder().encode(`\n\nPREP ERROR: ${errorMessage}`))
            } catch (sendError) {
              // Just log if we can't send
              console.error('[OpenRouter API] Failed to send prep error message:', {
                requestId,
                scriptId,
                error: sendError instanceof Error ? sendError.message : String(sendError),
              })
            }
          } finally {
            // Clear any remaining timer
            if (diagnosticTimer) {
              clearInterval(diagnosticTimer)
              diagnosticTimer = null
            }
          }
        } catch (fatalError) {
          // This is for truly fatal errors that should abort the stream
          console.error('[OpenRouter API] Fatal error in stream start:', {
            requestId,
            scriptId,
            errorMessage: fatalError instanceof Error ? fatalError.message : String(fatalError),
            errorStack: fatalError instanceof Error ? fatalError.stack : undefined,
            timestamp: new Date().toISOString(),
          })

          // Try to send an error message to the client
          try {
            const errorMessage = `Fatal error: ${fatalError instanceof Error ? fatalError.message : String(fatalError)}`
            controller.enqueue(new TextEncoder().encode(`\n\nFATAL ERROR: ${errorMessage}`))
          } catch (sendError) {
            // Just log if we can't send
            console.error('[OpenRouter API] Failed to send fatal error message:', {
              requestId,
              scriptId,
              error: sendError instanceof Error ? sendError.message : String(sendError),
            })
          }

          controller.error(fatalError)
        } finally {
          // Clear any remaining timer
          if (diagnosticTimer) {
            clearInterval(diagnosticTimer)
          }

          // Always close the controller in the outer finally block
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
