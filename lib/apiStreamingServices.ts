import { ScriptGenerationEvent } from '@/types/scriptGeneration'
import { logInteraction } from '@/lib/interaction-logger'
import { generateDraft, generateFinal } from '@/lib/apiService'
import { generateDraft as generateOpenRouterDraft } from '@/lib/openrouterService'

interface StreamingServiceInput {
  prompt: string
  requestId: string | null
  luckyRequestId: string | null
  interactionTimestamp: string | null
  scriptId?: string | null
  editableScript?: string
}

interface StreamingServiceResult {
  script: string
  scriptId: string
}

/**
 * Generates a script by making a request to the specified endpoint and handling streaming responses
 */
export const generateScript = async (
  url: string,
  input: StreamingServiceInput,
  emit: (event: ScriptGenerationEvent) => void
): Promise<StreamingServiceResult> => {
  if (input.interactionTimestamp) {
    await logInteraction(input.interactionTimestamp, 'stateMachine', 'Starting script generation', {
      url,
      prompt: input.prompt,
    })
  }

  if (url.includes('generate-draft')) {
    const result = await generateDraft(
      input.prompt,
      input.requestId,
      input.luckyRequestId,
      input.interactionTimestamp
    )
    emit({ type: 'SET_SCRIPT_ID', scriptId: result.scriptId })
    emit({ type: 'UPDATE_EDITABLE_SCRIPT', script: result.script })
    return { script: result.script, scriptId: result.scriptId }
  } else if (url.includes('generate-openrouter')) {
    const result = await generateOpenRouterDraft(
      input.prompt,
      input.requestId,
      input.luckyRequestId,
      input.interactionTimestamp
    )
    emit({ type: 'SET_SCRIPT_ID', scriptId: result.scriptId })
    emit({ type: 'UPDATE_EDITABLE_SCRIPT', script: result.script })
    return { script: result.script, scriptId: result.scriptId }
  } else {
    const result = await generateFinal(
      input.scriptId || '',
      input.editableScript || '',
      input.requestId,
      input.luckyRequestId,
      input.interactionTimestamp
    )
    emit({ type: 'UPDATE_EDITABLE_SCRIPT', script: result.script })
    return { script: result.script, scriptId: result.scriptId }
  }
}

export const generateDraftWithStream = async (
  input: StreamingServiceInput,
  emit: (event: ScriptGenerationEvent) => void
): Promise<StreamingServiceResult> => {
  return generateScript('/api/generate-draft', input, emit)
}

export const generateOpenRouterDraftWithStream = async (
  input: StreamingServiceInput,
  emit: (event: ScriptGenerationEvent) => void
): Promise<StreamingServiceResult> => {
  if (input.interactionTimestamp) {
    await logInteraction(
      input.interactionTimestamp,
      'stateMachine',
      'Starting OpenRouter script generation',
      {
        prompt: input.prompt,
      }
    )
  }

  try {
    const result = await generateOpenRouterDraft(
      input.prompt,
      input.requestId,
      input.luckyRequestId,
      input.interactionTimestamp
    )

    // Ensure we emit these events to update the state machine context
    if (result.scriptId) {
      emit({ type: 'SET_SCRIPT_ID', scriptId: result.scriptId })
      console.log('[OpenRouter] Set script ID:', result.scriptId)
    } else {
      console.error('[OpenRouter] No script ID returned from generateOpenRouterDraft')
    }

    // Check if script is undefined, null, or empty string
    if (result.script === undefined || result.script === null) {
      console.error('[OpenRouter] No script returned from generateOpenRouterDraft')
      // Use a default empty string to prevent further errors
      result.script = ''
    } else if (result.script.trim() === '') {
      console.warn('[OpenRouter] Empty script returned from generateOpenRouterDraft')
      // The script is empty but not undefined/null, so we'll still use it
    } else {
      console.log('[OpenRouter] Updated editable script, length:', result.script.length)
    }

    // Always emit the UPDATE_EDITABLE_SCRIPT event, even if the script is empty
    emit({ type: 'UPDATE_EDITABLE_SCRIPT', script: result.script })

    return { script: result.script, scriptId: result.scriptId }
  } catch (error) {
    console.error('[OpenRouter] Error in generateOpenRouterDraftWithStream:', error)
    throw error
  }
}

export const generateFinalWithStream = async (
  params: {
    prompt: string
    requestId: string | null
    luckyRequestId: string | null
    interactionTimestamp: string
    scriptId: string | null
    editableScript: string
  },
  callbacks: {
    onStartStreaming: () => void
    onChunk: (text: string) => void
    onError: (error: { message: string }) => void
    signal?: AbortSignal
  }
): Promise<{ script: string }> => {
  console.log('[API_STREAM_DEBUG] Starting generateFinalWithStream:', {
    prompt: params.prompt.substring(0, 50) + '...',
    scriptId: params.scriptId,
    timestamp: params.interactionTimestamp,
    hasSignal: !!callbacks.signal,
    isAborted: callbacks.signal?.aborted,
  })

  // Check if already aborted before we even start
  if (callbacks.signal?.aborted) {
    console.log('[API_STREAM_DEBUG] Request aborted before starting')
    throw new DOMException('The operation was aborted', 'AbortError')
  }

  // Variables to track stream state
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  let finalScript = ''
  let forceFlushInterval: NodeJS.Timeout | null = null

  try {
    callbacks.onStartStreaming()

    const response = await fetch('/api/generate-final', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Interaction-Timestamp': params.interactionTimestamp,
      },
      body: JSON.stringify({
        scriptId: params.scriptId,
        draftScript: params.editableScript,
        luckyRequestId: params.luckyRequestId,
        requestId: params.requestId,
      }),
      signal: callbacks.signal,
    })

    if (!response.ok) {
      console.error('[API_STREAM_DEBUG] HTTP error response:', {
        status: response.status,
        statusText: response.statusText,
      })

      if (response.status === 429) {
        callbacks.onError({ message: 'Daily generation limit reached. Try again tomorrow!' })
      } else if (response.status === 401) {
        callbacks.onError({ message: 'Session expired. Please sign in again.' })
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Failed to generate final script' }))
        callbacks.onError({ message: errorData.error || 'Failed to generate final script' })
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // Check again if aborted after fetch but before reading
    if (callbacks.signal?.aborted) {
      console.log('[API_STREAM_DEBUG] Request aborted after fetch but before reading')
      throw new DOMException('The operation was aborted', 'AbortError')
    }

    // Fix the TypeScript error by handling the optional chaining properly
    const bodyReader = response.body?.getReader()
    reader = bodyReader || null
    if (!reader) {
      console.error('[API_STREAM_DEBUG] No reader available from response')
      callbacks.onError({ message: 'No reader available' })
      throw new Error('No reader available')
    }

    let lastChunkEndsWithNewline = false
    let chunkCounter = 0
    let lastChunkTime = Date.now()
    let bufferForSmallChunks = ''

    // Reduce buffer size and time to make streaming more visible
    const MIN_CHUNK_SIZE = 10 // Reduced from 20 to make streaming more visible
    const MAX_BUFFER_TIME = 50 // Reduced from 100ms to make streaming more frequent

    // Track total bytes received for debugging
    let totalBytesReceived = 0
    const startTime = Date.now()

    console.log('[API_STREAM_DEBUG] Starting to read stream with buffer settings:', {
      minChunkSize: MIN_CHUNK_SIZE,
      maxBufferTime: MAX_BUFFER_TIME,
      timestamp: new Date().toISOString(),
    })

    // Helper function to flush buffer and send content
    const flushBuffer = () => {
      if (bufferForSmallChunks.length === 0) return

      finalScript += bufferForSmallChunks

      // Ensure proper line breaks around metadata comments
      finalScript = finalScript.replace(/^(\/\/ Name:.*?)(\n?)(\n?)(\/\/ Description:)/gm, '$1\n$4')
      finalScript = finalScript.replace(
        /^(\/\/ Description:.*?)(\n?)(\n?)(\/\/ Author:)/gm,
        '$1\n$4'
      )

      console.log(`[API_STREAM_DEBUG] Flushing buffer:`, {
        size: bufferForSmallChunks.length,
        totalScriptLength: finalScript.length,
        bufferPreview:
          bufferForSmallChunks.substring(0, 50) + (bufferForSmallChunks.length > 50 ? '...' : ''),
        timestamp: new Date().toISOString(),
      })

      // Check if aborted before sending chunk
      if (callbacks.signal?.aborted) {
        console.log('[API_STREAM_DEBUG] Skipping onChunk callback due to abort signal')
        return
      }

      callbacks.onChunk(finalScript)
      bufferForSmallChunks = ''
      lastChunkTime = Date.now()
    }

    // Set up a timer to force flush the buffer periodically
    forceFlushInterval = setInterval(() => {
      // Check if aborted before flushing
      if (callbacks.signal?.aborted) {
        console.log('[API_STREAM_DEBUG] Skipping force flush due to abort signal')
        return
      }

      if (bufferForSmallChunks.length > 0) {
        console.log('[API_STREAM_DEBUG] Force flushing buffer due to timer')
        flushBuffer()
      }
    }, MAX_BUFFER_TIME)

    try {
      while (true) {
        // Check if aborted
        if (callbacks.signal?.aborted) {
          console.log('[API_STREAM_DEBUG] Stream reading aborted by signal')
          if (reader) {
            try {
              await reader.cancel('Stream aborted by client')
              console.log('[API_STREAM_DEBUG] Reader cancelled successfully')
            } catch (e) {
              console.warn('[API_STREAM_DEBUG] Error cancelling reader:', e)
            }
          }
          throw new DOMException('The operation was aborted', 'AbortError')
        }

        try {
          // Check if reader is still valid
          if (!reader) {
            console.log('[API_STREAM_DEBUG] Reader is null, breaking loop')
            break
          }

          const { done, value } = await reader.read()
          if (done) {
            const totalTime = Date.now() - startTime
            console.log('[API_STREAM_DEBUG] Stream reading complete:', {
              totalChunks: chunkCounter,
              totalBytes: totalBytesReceived,
              totalTime: `${totalTime}ms`,
              avgBytesPerChunk: Math.round(totalBytesReceived / (chunkCounter || 1)),
              timestamp: new Date().toISOString(),
            })

            // Send any remaining buffered content
            if (bufferForSmallChunks.length > 0) {
              console.log('[API_STREAM_DEBUG] Sending final buffered content:', {
                size: bufferForSmallChunks.length,
                content:
                  bufferForSmallChunks.substring(0, 50) +
                  (bufferForSmallChunks.length > 50 ? '...' : ''),
                timestamp: new Date().toISOString(),
              })
              flushBuffer()
            }

            break
          }

          chunkCounter++
          totalBytesReceived += value.length
          const chunk = new TextDecoder().decode(value)

          console.log(`[API_STREAM_DEBUG] Received chunk #${chunkCounter}:`, {
            size: value.length,
            content: chunk.substring(0, 50) + (chunk.length > 50 ? '...' : ''),
            timeSinceStart: `${Date.now() - startTime}ms`,
            timestamp: new Date().toISOString(),
          })

          // Handle line breaks at chunk boundaries
          if (lastChunkEndsWithNewline && chunk.startsWith('\n')) {
            finalScript = finalScript.slice(0, -1)
          }

          // Add to buffer instead of directly to finalScript
          bufferForSmallChunks += chunk
          lastChunkEndsWithNewline = chunk.endsWith('\n')

          const currentTime = Date.now()
          const timeSinceLastChunk = currentTime - lastChunkTime

          // Decide whether to send the buffer based on size or time
          if (
            bufferForSmallChunks.length >= MIN_CHUNK_SIZE ||
            timeSinceLastChunk >= MAX_BUFFER_TIME
          ) {
            flushBuffer()
          } else {
            console.log(`[API_STREAM_DEBUG] Buffering chunk:`, {
              currentBufferSize: bufferForSmallChunks.length,
              timeSinceLastSend: `${timeSinceLastChunk}ms`,
              belowThreshold: bufferForSmallChunks.length < MIN_CHUNK_SIZE,
              timestamp: new Date().toISOString(),
            })
          }
        } catch (readError) {
          // If the read operation was aborted, handle it gracefully
          if (readError instanceof DOMException && readError.name === 'AbortError') {
            console.log('[API_STREAM_DEBUG] Read operation aborted')
            throw readError
          }

          console.error('[API_STREAM_DEBUG] Error reading from stream:', readError)
          callbacks.onError({ message: 'Error reading from stream' })
          throw readError
        }
      }

      return { script: finalScript }
    } catch (error) {
      // Allow abort errors to propagate normally
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('[API_STREAM_DEBUG] Operation aborted error:', error.message)
        throw error
      }

      console.error('[API_STREAM_DEBUG] Stream reading error:', error)
      if (error instanceof Response && error.status === 429) {
        callbacks.onError({
          message: 'Daily generation limit reached. Try again tomorrow!',
        })
      } else {
        callbacks.onError({
          message: error instanceof Error ? error.message : 'Failed to generate final script',
        })
      }
      throw error
    } finally {
      // Clear the force flush interval
      if (forceFlushInterval) {
        clearInterval(forceFlushInterval)
        forceFlushInterval = null
      }

      // Ensure reader is properly closed if it exists
      if (reader) {
        try {
          // Only try to cancel if not already aborted
          if (!callbacks.signal?.aborted) {
            await reader.cancel('Stream cleanup').catch(e => {
              console.warn('[API_STREAM_DEBUG] Error cancelling reader during cleanup:', e)
            })
          }
        } catch (e) {
          console.warn('[API_STREAM_DEBUG] Error during reader cleanup:', e)
        } finally {
          reader = null
        }
      }
    }
  } catch (error) {
    // Allow abort errors to propagate normally
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('[API_STREAM_DEBUG] Operation aborted error:', error.message)
      throw error
    }

    console.error('[API_STREAM_DEBUG] Stream reading error:', error)
    if (error instanceof Response && error.status === 429) {
      callbacks.onError({
        message: 'Daily generation limit reached. Try again tomorrow!',
      })
    } else {
      callbacks.onError({
        message: error instanceof Error ? error.message : 'Failed to generate final script',
      })
    }
    throw error
  } finally {
    // Ensure interval is cleared in the outer finally block as well
    if (forceFlushInterval) {
      clearInterval(forceFlushInterval)
    }
  }
}
