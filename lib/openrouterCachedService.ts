import { extractReasoningManually } from './reasoning-extractor'

export interface DraftResult {
  scriptId: string
  script: string
  reasoning: string
  hasReasoning: boolean
}

interface StreamCallbacks {
  onStartStreaming?: () => void
  onScriptId?: (scriptId: string) => void
  onChunk?: (text: string) => void
  onReasoning?: (reasoning: string) => void
  onError?: (error: Error) => void
}

/**
 * Generates a draft script using the cached OpenRouter API
 *
 * This function sends a request to the cached OpenRouter API endpoint
 * and returns the generated script along with its ID and any extracted reasoning.
 */
export async function generateDraftWithCachedApi(
  prompt: string,
  requestId: string | null,
  luckyRequestId: string | null,
  interactionTimestamp: string | null
): Promise<DraftResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (interactionTimestamp) {
    headers['Interaction-Timestamp'] = interactionTimestamp
  }

  const response = await fetch('/api/generate-openrouter-cached', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt,
      requestId,
      luckyRequestId,
      extractReasoning: true, // Always request reasoning extraction
    }),
  })

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED')
  }

  if (response.status === 429) {
    // Handle too many requests (duplicate request)
    const errorData = await response.json().catch(() => ({}))
    console.warn('Duplicate request detected:', errorData)
    throw new Error(errorData.error || 'A similar request is already being processed')
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

  // Always process the response for reasoning
  const { text, reasoning, hasReasoning } = extractReasoningManually(buffer)

  // Ensure we never return undefined for script
  const script = text || buffer || ''

  // Only consider a script truly empty if:
  // 1. The buffer has a reasonable length (not just a few initial characters)
  // 2. After processing, we still don't have meaningful content
  const MIN_BUFFER_LENGTH_THRESHOLD = 50 // Minimum characters to consider a valid response
  if ((!script || script.trim() === '') && buffer.length > MIN_BUFFER_LENGTH_THRESHOLD) {
    console.warn('Generated script is empty after processing', {
      bufferLength: buffer.length,
      hasText: !!text,
      hasReasoning,
    })
  } else if (!script || script.trim() === '') {
    console.log('Script appears empty, but buffer may be incomplete', {
      bufferLength: buffer.length,
      hasText: !!text,
      hasReasoning,
    })
  }

  return {
    scriptId,
    script, // Use the text without reasoning tags, fallback to buffer, then to empty string
    reasoning: reasoning || '',
    hasReasoning,
  }
}

/**
 * Generates a draft script with streaming using the cached OpenRouter API
 *
 * This function sends a request to the cached OpenRouter API endpoint
 * and streams the response, calling the provided callbacks as data is received.
 */
export async function generateDraftWithCachedApiStream(
  prompt: string,
  luckyRequestId: string | null,
  timestamp: string,
  signal: AbortSignal,
  callbacks: StreamCallbacks = {}
): Promise<void> {
  console.log('[OpenRouter Cached API] Starting generateDraftWithCachedApiStream:', {
    prompt,
    luckyRequestId,
    timestamp,
    isAborted: signal.aborted,
  })

  try {
    const res = await fetch('/api/generate-openrouter-cached', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Interaction-Timestamp': timestamp,
      },
      body: JSON.stringify({
        prompt,
        luckyRequestId,
        extractReasoning: true,
      }),
      signal,
    })

    if (res.status === 401) {
      throw new Error('UNAUTHORIZED')
    }

    if (res.status === 429) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.error || 'Too many requests or duplicate request')
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.details || `Failed to generate draft: ${res.status}`)
    }

    const reader = res.body?.getReader()
    if (!reader) {
      throw new Error('No reader available for streaming')
    }

    // Signal that streaming has started
    callbacks.onStartStreaming?.()

    let buffer = ''
    let scriptId = ''
    let reasoningBuffer = ''
    let isFirstChunk = true

    while (true) {
      // Check if aborted
      if (signal.aborted) {
        console.log('[OpenRouter Cached API] Request aborted by signal')
        break
      }

      const { done, value } = await reader.read()
      if (done) break

      const chunkText = new TextDecoder().decode(value)
      buffer += chunkText

      // Extract script ID from the first chunk if present
      if (isFirstChunk && buffer.includes('__SCRIPT_ID__')) {
        const match = buffer.match(/__SCRIPT_ID__(.+?)__SCRIPT_ID__/)
        if (match) {
          scriptId = match[1]
          buffer = buffer.replace(/__SCRIPT_ID__.+?__SCRIPT_ID__/, '')
          callbacks.onScriptId?.(scriptId)
        }
        isFirstChunk = false
      }

      // Process for reasoning tags in the buffer
      const { text, reasoning, hasReasoning } = extractReasoningManually(buffer)

      // If we found reasoning, update the buffer and notify
      if (hasReasoning && reasoning !== reasoningBuffer) {
        reasoningBuffer = reasoning
        callbacks.onReasoning?.(reasoning)
      }

      // Check if we have meaningful content before sending the chunk
      // For very small buffers in the first few chunks, don't log warnings
      const MIN_BUFFER_LENGTH_THRESHOLD = 50
      if (
        (!text || text.trim() === '') &&
        buffer.length < MIN_BUFFER_LENGTH_THRESHOLD &&
        !isFirstChunk
      ) {
        console.log('[OpenRouter Cached API] Buffer appears incomplete or empty', {
          bufferLength: buffer.length,
          hasText: !!text,
          hasReasoning,
          isFirstChunk,
        })
        // Still send what we have, but log that it might be incomplete
      }

      // Send the processed text (without reasoning tags) to the callback
      callbacks.onChunk?.(text || buffer)
    }

    console.log('[OpenRouter Cached API] Streaming completed')
  } catch (error) {
    console.error('[OpenRouter Cached API] Error during streaming:', error)
    callbacks.onError?.(error instanceof Error ? error : new Error(String(error)))
  }
}
