import { toast } from 'react-hot-toast'
import { extractReasoningManually } from './reasoning-extractor'

export interface DraftResult {
  scriptId: string
  script: string
  reasoning: string
  hasReasoning: boolean
}

export async function generateDraft(
  prompt: string,
  requestId: string | null,
  luckyRequestId: string | null,
  interactionTimestamp: string | null
): Promise<DraftResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (interactionTimestamp) {
    headers['Interaction-Timestamp'] = interactionTimestamp
  }

  const response = await fetch('/api/generate-openrouter', {
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

export async function generateFinal(
  scriptId: string,
  draftScript: string,
  requestId: string | null,
  luckyRequestId: string | null,
  interactionTimestamp: string | null
): Promise<{ scriptId: string; script: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (interactionTimestamp) {
    headers['Interaction-Timestamp'] = interactionTimestamp
  }

  // Note: For now, still using the existing final generation endpoint
  // Future implementation would use an OpenRouter version of this endpoint
  const response = await fetch('/api/generate-final', {
    method: 'POST',
    headers,
    body: JSON.stringify({ scriptId, draftScript, requestId, luckyRequestId }),
  })

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED')
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.details || 'Failed to generate final script')
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No reader available for final generation')
  }

  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += new TextDecoder().decode(value)
  }

  return { scriptId, script: buffer }
}

export async function saveScript(prompt: string, editableScript: string): Promise<void> {
  const response = await fetch('/api/scripts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, code: editableScript, saved: true }),
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
  })
  if (!scriptResponse.ok) {
    throw new Error('Failed to save script before install')
  }

  const { id, dashedName } = await scriptResponse.json()

  const installResponse = await fetch('/api/install', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scriptId: id }),
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
  const response = await fetch('/api/usage')
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
  onReasoning?: (reasoning: string) => void
  onError?: (error: Error) => void
}

export async function generateDraftWithStream(
  prompt: string,
  luckyRequestId: string | null,
  timestamp: string,
  signal: AbortSignal,
  callbacks: StreamCallbacks = {}
): Promise<void> {
  console.log('[OpenRouter API] Starting generateDraftWithStream:', {
    prompt,
    luckyRequestId,
    timestamp,
    isAborted: signal.aborted,
  })

  try {
    const res = await fetch('/api/generate-openrouter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Interaction-Timestamp': timestamp,
      },
      body: JSON.stringify({
        prompt,
        luckyRequestId,
        extractReasoning: true, // Always request reasoning extraction
      }),
      signal,
    })

    console.log('[OpenRouter API] Fetch response received:', {
      status: res.status,
      ok: res.ok,
      timestamp: new Date().toISOString(),
    })

    if (res.status === 401) {
      console.error('[OpenRouter API] Unauthorized error')
      throw new Error('UNAUTHORIZED')
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      console.error('[OpenRouter API] Response not OK:', {
        status: res.status,
        data,
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
      console.error('[OpenRouter API] No reader available')
      throw new Error('No reader available')
    }

    try {
      let buffer = ''
      console.log('[OpenRouter API] Starting stream reading')
      callbacks.onStartStreaming?.()

      while (true) {
        try {
          const { done, value } = await reader.read()
          if (done) {
            console.log('[OpenRouter API] Stream reading complete')
            break
          }

          const text = new TextDecoder().decode(value)
          buffer += text

          // Only trim when checking for script ID
          const trimmedBuffer = buffer.trim()
          const idMatch = trimmedBuffer.match(/__SCRIPT_ID__(.+?)__SCRIPT_ID__/)
          if (idMatch) {
            const scriptId = idMatch[1]
            console.log('[OpenRouter API] Script ID received:', scriptId)
            buffer = buffer.replace(/__SCRIPT_ID__.+?__SCRIPT_ID__/, '')
            callbacks.onScriptId?.(scriptId)
          }

          console.log('[OpenRouter API] Chunk received:', {
            chunkSize: text.length,
            totalBufferSize: buffer.length,
            timestamp: new Date().toISOString(),
          })

          // Process the buffer for reasoning as we receive chunks
          const { text: processedText, reasoning } = extractReasoningManually(buffer)

          // Send the processed text (without reasoning tags) to the onChunk callback
          callbacks.onChunk?.(processedText || buffer)

          // If we have reasoning, send it to the onReasoning callback
          if (reasoning && callbacks.onReasoning) {
            callbacks.onReasoning(reasoning)
          }
        } catch (readError) {
          console.error('[OpenRouter API] Error during stream read:', readError)
          if (signal.aborted) {
            console.log('[OpenRouter API] Stream aborted')
            return
          }
          // If we get a read error but have a buffer, we can still use it
          if (buffer) {
            console.log('[OpenRouter API] Using existing buffer despite read error')
            // Process the buffer for reasoning before sending the final chunk
            const { text: processedText, reasoning } = extractReasoningManually(buffer)
            callbacks.onChunk?.(processedText || buffer)
            if (reasoning && callbacks.onReasoning) {
              callbacks.onReasoning(reasoning)
            }
          }
          break
        }
      }

      // Only proceed if we have a valid buffer and haven't been aborted
      if (buffer && !signal.aborted) {
        console.log('[OpenRouter API] Final buffer delivery:', {
          bufferSize: buffer.length,
          timestamp: new Date().toISOString(),
        })

        // Process the final buffer for reasoning
        const { text: finalText, reasoning: finalReasoning } = extractReasoningManually(buffer)

        // Check if we have meaningful content before sending the final chunk
        const MIN_BUFFER_LENGTH_THRESHOLD = 50
        if (
          (!finalText || finalText.trim() === '') &&
          buffer.length < MIN_BUFFER_LENGTH_THRESHOLD
        ) {
          console.log('[OpenRouter API] Final buffer appears incomplete or empty', {
            bufferLength: buffer.length,
            hasText: !!finalText,
            hasReasoning: !!finalReasoning,
          })
          // Still send what we have, but log that it might be incomplete
        }

        // Send the final processed text
        callbacks.onChunk?.(finalText || buffer)

        // Send the final reasoning
        if (finalReasoning && callbacks.onReasoning) {
          callbacks.onReasoning(finalReasoning)
        }
      }
    } finally {
      if (!signal.aborted) {
        console.log('[OpenRouter API] Cancelling reader')
        reader.cancel().catch(err => {
          console.error('[OpenRouter API] Error cancelling reader:', err)
        })
      }
    }
  } catch (error) {
    console.error('[OpenRouter API] Error in generateDraftWithStream:', error)
    const err = error instanceof Error ? error : new Error('Generation failed')
    callbacks.onError?.(err)
    throw err
  }
}
