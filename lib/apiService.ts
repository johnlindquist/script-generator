import { toast } from 'react-hot-toast'
import { logInteraction } from './interaction-logger'

export async function generateDraft(
  prompt: string,
  requestId: string | null,
  luckyRequestId: string | null,
  interactionTimestamp: string | null
): Promise<{ scriptId: string; script: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (interactionTimestamp) {
    headers['Interaction-Timestamp'] = interactionTimestamp
  }

  const response = await fetch('/api/generate-draft', {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt, requestId, luckyRequestId }),
    credentials: 'include',
  })

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED')
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.details || 'Failed to generate draft')
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No reader available for draft generation')
  }

  let buffer = ''
  let scriptId = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunkText = new TextDecoder().decode(value)
    buffer += chunkText

    // Extract script ID if present
    const match = buffer.match(/__SCRIPT_ID__(.+?)__SCRIPT_ID__/)
    if (match) {
      scriptId = match[1]
      buffer = buffer.replace(/__SCRIPT_ID__.+?__SCRIPT_ID__/, '')
    }
  }

  return { scriptId, script: buffer }
}

export async function saveScript(prompt: string, editableScript: string): Promise<void> {
  const response = await fetch('/api/scripts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, code: editableScript, saved: true }),
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error('Failed to save script')
  }
}

export async function saveAndInstallScript(prompt: string, editableScript: string): Promise<void> {
  const scriptResponse = await fetch('/api/scripts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, code: editableScript, saved: true }),
    credentials: 'include',
  })
  if (!scriptResponse.ok) {
    throw new Error('Failed to save script before install')
  }

  const { id, dashedName } = await scriptResponse.json()

  const installResponse = await fetch('/api/install', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scriptId: id }),
    credentials: 'include',
  })
  if (!installResponse.ok) {
    throw new Error('Failed to track install')
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://scriptkit.com'
  window.location.href = `/api/new?name=${encodeURIComponent(
    dashedName || 'script-name-not-found'
  )}&url=${encodeURIComponent(`${baseUrl}/scripts/${id}/raw/${dashedName || 'script'}.ts`)}`
}

interface UsageResponse {
  count: number
  limit: number
}

export async function fetchUsage(): Promise<UsageResponse> {
  const response = await fetch('/api/usage', {
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error('Failed to fetch usage')
  }
  return response.json()
}

interface LuckyResponse {
  combinedPrompt: string
  requestId: string
}

export async function generateLucky(timestamp: string): Promise<LuckyResponse> {
  const response = await fetch('/api/lucky', {
    headers: {
      'Interaction-Timestamp': timestamp,
    },
    credentials: 'include',
  })

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED')
  }

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || 'Failed to get random scripts')
  }

  if (!data.combinedPrompt) {
    throw new Error('Invalid response format')
  }

  return {
    combinedPrompt: data.combinedPrompt,
    requestId: data.requestId,
  }
}

interface StreamCallbacks {
  onStartStreaming?: () => void
  onScriptId?: (scriptId: string) => void
  onChunk?: (text: string) => void
  onComplete?: () => void
  onError?: (error: Error) => void
}

export async function generateDraftWithStream(
  prompt: string,
  luckyRequestId: string | null,
  timestamp: string,
  signal: AbortSignal,
  callbacks: StreamCallbacks = {}
): Promise<void> {
  console.log('[API] Starting generateDraftWithStream:', {
    prompt: prompt.slice(0, 30) + (prompt.length > 30 ? '...' : ''),
    promptLength: prompt.length,
    luckyRequestId,
    timestamp,
    isAborted: signal.aborted,
    environment: process.env.NODE_ENV,
  })

  try {
    console.log('[API] Making fetch request to /api/generate-draft', {
      method: 'POST',
      hasTimestamp: !!timestamp,
      hasPrompt: !!prompt,
      promptLength: prompt.length,
      timestamp: new Date().toISOString(),
    })

    const res = await fetch('/api/generate-draft', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Interaction-Timestamp': timestamp,
      },
      body: JSON.stringify({
        prompt,
        luckyRequestId,
      }),
      signal,
      credentials: 'include',
    })

    console.log('[API] Fetch response received:', {
      status: res.status,
      ok: res.ok,
      statusText: res.statusText,
      headers: Object.fromEntries([...res.headers.entries()]),
      timestamp: new Date().toISOString(),
      hasBody: !!res.body,
    })

    if (res.status === 401) {
      console.error('[API] Unauthorized error', {
        timestamp: new Date().toISOString(),
        headers: Object.fromEntries([...res.headers.entries()]),
      })
      throw new Error('UNAUTHORIZED')
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      console.error('[API] Response not OK:', {
        status: res.status,
        data,
        statusText: res.statusText,
        headers: Object.fromEntries([...res.headers.entries()]),
        timestamp: new Date().toISOString(),
      })

      // Add toast notifications for different error cases
      if (res.status === 429) {
        toast.error('Daily generation limit reached. Try again tomorrow!')
      } else if (res.status === 401) {
        toast.error('Session expired. Please sign in again.')
      } else {
        toast.error(data.error || 'Failed to generate draft')
      }

      throw new Error(data.error || 'Failed to generate draft')
    }

    const reader = res.body?.getReader()
    if (!reader) {
      console.error('[API] No reader available', {
        timestamp: new Date().toISOString(),
        responseType: res.type,
        hasBody: !!res.body,
      })
      throw new Error('No reader available')
    }

    try {
      let buffer = ''
      console.log('[API] Starting stream reading', {
        timestamp: new Date().toISOString(),
        responseType: res.type,
      })
      callbacks.onStartStreaming?.()

      while (true) {
        try {
          console.log('[API] Reading chunk from stream', {
            timestamp: new Date().toISOString(),
            currentBufferLength: buffer.length,
          })

          const { done, value } = await reader.read()

          if (done) {
            console.log('[API] Stream reading complete', {
              timestamp: new Date().toISOString(),
              finalBufferLength: buffer.length,
            })
            break
          }

          const text = new TextDecoder().decode(value)
          const prevLength = buffer.length
          buffer += text

          console.log('[API] Chunk decoded', {
            chunkSize: text.length,
            chunkPreview: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
            timestamp: new Date().toISOString(),
          })

          // Extract script ID if present
          const match = buffer.match(/__SCRIPT_ID__(.+?)__SCRIPT_ID__/)
          if (match) {
            const scriptId = match[1]
            console.log('[API] Script ID received:', scriptId, {
              timestamp: new Date().toISOString(),
            })
            buffer = buffer.replace(/__SCRIPT_ID__.+?__SCRIPT_ID__/, '')
            callbacks.onScriptId?.(scriptId)
          }

          console.log('[API] Chunk received:', {
            chunkSize: text.length,
            totalBufferSize: buffer.length,
            timestamp: new Date().toISOString(),
            chunkPreview: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
          })

          // Send only the new delta to the client instead of the entire buffer
          const delta = buffer.slice(prevLength)
          if (delta) {
            callbacks.onChunk?.(delta)
          }
        } catch (readError) {
          console.error('[API] Error during stream read:', readError, {
            errorMessage: readError instanceof Error ? readError.message : String(readError),
            errorStack: readError instanceof Error ? readError.stack : undefined,
            timestamp: new Date().toISOString(),
            isAborted: signal.aborted,
            currentBufferLength: buffer.length,
          })
          if (signal.aborted) {
            console.log('[API] Stream aborted', {
              timestamp: new Date().toISOString(),
            })
            return
          }
          // If we get a read error but have a buffer, we can still use it
          if (buffer) {
            console.log('[API] Using existing buffer despite read error', {
              bufferLength: buffer.length,
              timestamp: new Date().toISOString(),
            })
            callbacks.onChunk?.(buffer)
          }
          break
        }
      }

      // Only proceed if we have a valid buffer and haven't been aborted
      if (buffer && !signal.aborted) {
        console.log('[API] Final buffer delivery:', {
          bufferSize: buffer.length,
          timestamp: new Date().toISOString(),
          bufferPreview: buffer.substring(0, 30) + (buffer.length > 30 ? '...' : ''),
        })
        callbacks.onChunk?.(buffer)
      }
    } finally {
      if (!signal.aborted) {
        console.log('[API] Cancelling reader', {
          timestamp: new Date().toISOString(),
        })
        reader.cancel().catch(err => {
          console.error('[API] Error cancelling reader:', err, {
            errorMessage: err instanceof Error ? err.message : String(err),
            timestamp: new Date().toISOString(),
          })
        })
      }
    }
  } catch (error) {
    console.error('[API] Error in generateDraftWithStream:', error, {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      isAborted: signal.aborted,
    })
    const err = error instanceof Error ? error : new Error('Generation failed')
    callbacks.onError?.(err)
    throw err
  }
}

export async function generateOpenRouterDraftWithStream(
  prompt: string,
  luckyRequestId: string | null,
  timestamp: string,
  signal: AbortSignal,
  callbacks: StreamCallbacks = {},
  extractReasoning = false
): Promise<void> {
  console.log('[API] Starting generateOpenRouterDraftWithStream:', {
    prompt: prompt.slice(0, 30) + (prompt.length > 30 ? '...' : ''),
    promptLength: prompt.length,
    luckyRequestId,
    timestamp,
    isAborted: signal.aborted,
    extractReasoning,
    environment: process.env.NODE_ENV,
  })

  try {
    console.log('[API] Making fetch request to /api/generate-openrouter', {
      method: 'POST',
      hasTimestamp: !!timestamp,
      hasPrompt: !!prompt,
      promptLength: prompt.length,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    })

    const res = await fetch('/api/generate-openrouter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Interaction-Timestamp': timestamp,
      },
      body: JSON.stringify({
        prompt,
        luckyRequestId,
        extractReasoning,
      }),
      signal,
      credentials: 'include',
    })

    console.log('[API] OpenRouter fetch response received:', {
      status: res.status,
      ok: res.ok,
      statusText: res.statusText,
      headers: Object.fromEntries([...res.headers.entries()]),
      timestamp: new Date().toISOString(),
      hasBody: !!res.body,
      environment: process.env.NODE_ENV,
    })

    if (res.status === 401) {
      console.error('[API] Unauthorized error', {
        timestamp: new Date().toISOString(),
        headers: Object.fromEntries([...res.headers.entries()]),
      })
      throw new Error('UNAUTHORIZED')
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      console.error('[API] OpenRouter response not OK:', {
        status: res.status,
        statusText: res.statusText,
        data,
        headers: Object.fromEntries([...res.headers.entries()]),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      })

      // Add toast notifications for different error cases
      if (res.status === 429) {
        toast.error('Daily generation limit reached. Try again tomorrow!')
      } else if (res.status === 401) {
        toast.error('Session expired. Please sign in again.')
      } else {
        toast.error(data.error || 'Failed to generate draft')
      }

      throw new Error(data.error || 'Failed to generate draft')
    }

    const reader = res.body?.getReader()
    if (!reader) {
      console.error('[API] No reader available', {
        timestamp: new Date().toISOString(),
        responseType: res.type,
        hasBody: !!res.body,
        environment: process.env.NODE_ENV,
      })
      throw new Error('No reader available')
    }

    try {
      let buffer = ''
      console.log('[API] Starting OpenRouter stream reading', {
        timestamp: new Date().toISOString(),
        responseType: res.type,
        environment: process.env.NODE_ENV,
      })
      callbacks.onStartStreaming?.()

      while (true) {
        try {
          console.log('[API] Reading chunk from OpenRouter stream', {
            timestamp: new Date().toISOString(),
            currentBufferLength: buffer.length,
            environment: process.env.NODE_ENV,
          })

          const { done, value } = await reader.read()

          if (done) {
            console.log('[API] OpenRouter stream reading complete', {
              timestamp: new Date().toISOString(),
              finalBufferLength: buffer.length,
              environment: process.env.NODE_ENV,
            })
            break
          }

          const text = new TextDecoder().decode(value)
          const prevLength = buffer.length
          buffer += text

          console.log('[API] OpenRouter chunk decoded', {
            chunkSize: text.length,
            chunkPreview: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
          })

          // Extract script ID if present
          const match = buffer.match(/__SCRIPT_ID__(.+?)__SCRIPT_ID__/)
          if (match) {
            const scriptId = match[1]
            console.log('[API] Script ID received from OpenRouter:', scriptId, {
              timestamp: new Date().toISOString(),
              environment: process.env.NODE_ENV,
            })
            buffer = buffer.replace(/__SCRIPT_ID__.+?__SCRIPT_ID__/, '')
            callbacks.onScriptId?.(scriptId)
          }

          console.log('[API] OpenRouter chunk received:', {
            chunkSize: text.length,
            totalBufferSize: buffer.length,
            timestamp: new Date().toISOString(),
            chunkPreview: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
            hasScriptId: !!match,
            bufferPreview: buffer.substring(0, 30) + (buffer.length > 30 ? '...' : ''),
            environment: process.env.NODE_ENV,
          })

          // Send only the new delta to the client instead of the entire buffer
          const delta = buffer.slice(prevLength)
          if (delta) {
            callbacks.onChunk?.(delta)
          }
        } catch (readError) {
          console.error('[API] Error during OpenRouter stream read:', readError, {
            errorMessage: readError instanceof Error ? readError.message : String(readError),
            errorStack: readError instanceof Error ? readError.stack : undefined,
            timestamp: new Date().toISOString(),
            isAborted: signal.aborted,
            currentBufferLength: buffer.length,
            environment: process.env.NODE_ENV,
          })
          if (signal.aborted) {
            console.log('[API] OpenRouter stream aborted', {
              timestamp: new Date().toISOString(),
              environment: process.env.NODE_ENV,
            })
            return
          }
          // If we get a read error but have a buffer, we can still use it
          if (buffer) {
            console.log('[API] Using existing OpenRouter buffer despite read error', {
              bufferLength: buffer.length,
              timestamp: new Date().toISOString(),
              bufferPreview: buffer.substring(0, 30) + (buffer.length > 30 ? '...' : ''),
              environment: process.env.NODE_ENV,
            })
            callbacks.onChunk?.(buffer)
          }
          break
        }
      }

      // Only proceed if we have a valid buffer and haven't been aborted
      if (buffer && !signal.aborted) {
        console.log('[API] Final OpenRouter buffer delivery:', {
          bufferSize: buffer.length,
          timestamp: new Date().toISOString(),
          bufferPreview: buffer.substring(0, 30) + (buffer.length > 30 ? '...' : ''),
          environment: process.env.NODE_ENV,
        })
        callbacks.onChunk?.(buffer)
      }
    } finally {
      if (!signal.aborted) {
        console.log('[API] Cancelling OpenRouter reader', {
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV,
        })
        reader.cancel().catch(err => {
          console.error('[API] Error cancelling OpenRouter reader:', err, {
            errorMessage: err instanceof Error ? err.message : String(err),
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
          })
        })
      }
    }
  } catch (error) {
    console.error('[API] Error in generateOpenRouterDraftWithStream:', error, {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      isAborted: signal.aborted,
      environment: process.env.NODE_ENV,
    })
    const err = error instanceof Error ? error : new Error('Generation failed')
    callbacks.onError?.(err)
    throw err
  }
}

export async function generateAIGatewayDraftWithStream(
  prompt: string,
  luckyRequestId: string | null,
  timestamp: string,
  signal: AbortSignal,
  callbacks: StreamCallbacks = {},
  extractReasoning = false
): Promise<void> {
  await logInteraction(timestamp, 'client', 'Starting generateAIGatewayDraftWithStream', {
    prompt: prompt.slice(0, 30) + (prompt.length > 30 ? '...' : ''),
    promptLength: prompt.length,
    luckyRequestId,
    isAborted: signal.aborted,
    extractReasoning,
    environment: process.env.NODE_ENV,
    fix: 'Using accumulated content instead of individual chunks',
  })

  try {
    await logInteraction(timestamp, 'client', 'Making fetch request to /api/generate-ai-gateway', {
      method: 'POST',
      hasTimestamp: !!timestamp,
      hasPrompt: !!prompt,
      promptLength: prompt.length,
    })

    const res = await fetch('/api/generate-ai-gateway', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Interaction-Timestamp': timestamp,
      },
      body: JSON.stringify({
        prompt,
        luckyRequestId,
        extractReasoning,
      }),
      signal,
      credentials: 'include',
    })

    await logInteraction(timestamp, 'client', 'AI Gateway fetch response received', {
      status: res.status,
      ok: res.ok,
      statusText: res.statusText,
      headers: Object.fromEntries([...res.headers.entries()]),
      hasBody: !!res.body,
    })

    if (res.status === 401) {
      await logInteraction(timestamp, 'client', 'Unauthorized error in AI Gateway', {
        headers: Object.fromEntries([...res.headers.entries()]),
      })
      throw new Error('UNAUTHORIZED')
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      await logInteraction(timestamp, 'client', 'AI Gateway response not OK', {
        status: res.status,
        data,
        statusText: res.statusText,
        headers: Object.fromEntries([...res.headers.entries()]),
      })

      // Add toast notifications for different error cases
      if (res.status === 429) {
        toast.error('Daily generation limit reached. Try again tomorrow!')
      } else if (res.status === 401) {
        toast.error('Session expired. Please sign in again.')
      } else {
        toast.error(data.error || 'Failed to generate draft')
      }

      throw new Error(data.error || 'Failed to generate draft')
    }

    const reader = res.body?.getReader()
    if (!reader) {
      await logInteraction(timestamp, 'client', 'No reader available for AI Gateway', {
        responseType: res.type,
        hasBody: !!res.body,
      })
      throw new Error('No reader available')
    }

    await logInteraction(timestamp, 'client', 'Starting to read AI Gateway stream', {
      hasCallbacks: {
        onStartStreaming: !!callbacks.onStartStreaming,
        onScriptId: !!callbacks.onScriptId,
        onChunk: !!callbacks.onChunk,
        onComplete: !!callbacks.onComplete,
        onError: !!callbacks.onError,
      },
    })

    // Signal that streaming has started
    callbacks.onStartStreaming?.()

    let buffer = ''
    let scriptId = ''
    let isFirstChunk = true
    let chunkCount = 0
    let accumulatedContent = ''

    try {
      while (true) {
        if (signal.aborted) {
          await logInteraction(timestamp, 'client', 'AI Gateway stream aborted by signal', {
            chunkCount,
            bufferLength: buffer.length,
          })
          break
        }

        const { done, value } = await reader.read()

        if (done) {
          await logInteraction(timestamp, 'client', 'AI Gateway stream completed', {
            totalChunks: chunkCount,
            finalBufferLength: buffer.length,
            hasScriptId: !!scriptId,
          })
          break
        }

        chunkCount++

        const chunkText = new TextDecoder().decode(value)
        buffer += chunkText

        await logInteraction(timestamp, 'client', 'AI Gateway chunk received', {
          chunkNumber: chunkCount,
          chunkLength: chunkText.length,
          bufferLength: buffer.length,
          isFirstChunk,
          preview: chunkText.substring(0, 50).replace(/\n/g, '\\n'),
        })

        // Extract script ID if present (only check once)
        if (isFirstChunk) {
          const match = buffer.match(/__SCRIPT_ID__(.+?)__SCRIPT_ID__/)
          if (match) {
            scriptId = match[1]
            buffer = buffer.replace(/__SCRIPT_ID__.+?__SCRIPT_ID__/, '')
            await logInteraction(timestamp, 'client', 'AI Gateway script ID extracted', {
              scriptId,
              bufferLengthAfterRemoval: buffer.length,
            })
            callbacks.onScriptId?.(scriptId)
          }
          isFirstChunk = false
        }

        // Process this chunk and add it to accumulated content
        if (chunkText && callbacks.onChunk) {
          // For AI Gateway, we process the chunk text directly
          let processedChunk = chunkText

          // Remove script ID from the chunk if it's still there
          if (processedChunk.includes('__SCRIPT_ID__')) {
            processedChunk = processedChunk.replace(/__SCRIPT_ID__.+?__SCRIPT_ID__/, '')
          }

          if (processedChunk) {
            // Append to the running buffer for final completion needs
            accumulatedContent += processedChunk

            await logInteraction(timestamp, 'client', 'AI Gateway sending delta to callback', {
              chunkNumber: chunkCount,
              processedChunkLength: processedChunk.length,
              accumulatedLength: accumulatedContent.length,
              preview: processedChunk.substring(0, 30).replace(/\n/g, '\\n'),
            })

            // Send only the delta (processedChunk) to the client UI
            callbacks.onChunk(processedChunk)
          }
        }

        // Small delay to prevent overwhelming the UI
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      // Signal completion
      await logInteraction(timestamp, 'client', 'AI Gateway calling onComplete callback', {
        finalBufferLength: buffer.length,
        finalAccumulatedLength: accumulatedContent.length,
        scriptId,
        totalChunks: chunkCount,
        accumulatedPreview: accumulatedContent.substring(0, 100).replace(/\n/g, '\\n'),
      })

      callbacks.onComplete?.()
    } catch (readerError) {
      await logInteraction(timestamp, 'client', 'Error reading AI Gateway stream', {
        error: readerError instanceof Error ? readerError.message : String(readerError),
        chunkCount,
        bufferLength: buffer.length,
      })
      callbacks.onError?.(
        readerError instanceof Error ? readerError : new Error(String(readerError))
      )
      throw readerError
    } finally {
      // Ensure reader is properly closed
      try {
        reader.releaseLock()
        await logInteraction(timestamp, 'client', 'AI Gateway reader lock released', {})
      } catch (releaseError) {
        await logInteraction(timestamp, 'client', 'Error releasing AI Gateway reader lock', {
          error: releaseError instanceof Error ? releaseError.message : String(releaseError),
        })
      }
    }
  } catch (error) {
    await logInteraction(timestamp, 'client', 'Error in generateAIGatewayDraftWithStream', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      environment: process.env.NODE_ENV,
    })

    callbacks.onError?.(error instanceof Error ? error : new Error(String(error)))
    throw error
  }
}

// Function to choose between implementations
export async function generateDraftWithProvider(
  provider: 'default' | 'openrouter' | 'ai-gateway',
  prompt: string,
  luckyRequestId: string | null,
  timestamp: string,
  signal: AbortSignal,
  callbacks: StreamCallbacks = {},
  options: { extractReasoning?: boolean } = {}
): Promise<void> {
  if (provider === 'openrouter') {
    return generateOpenRouterDraftWithStream(
      prompt,
      luckyRequestId,
      timestamp,
      signal,
      callbacks,
      options.extractReasoning
    )
  }

  if (provider === 'ai-gateway') {
    return generateAIGatewayDraftWithStream(
      prompt,
      luckyRequestId,
      timestamp,
      signal,
      callbacks,
      options.extractReasoning
    )
  }

  return generateDraftWithStream(prompt, luckyRequestId, timestamp, signal, callbacks)
}
