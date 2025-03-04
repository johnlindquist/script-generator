import { toast } from 'react-hot-toast'

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
    prompt,
    luckyRequestId,
    timestamp,
    isAborted: signal.aborted,
  })

  try {
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
    })

    console.log('[API] Fetch response received:', {
      status: res.status,
      ok: res.ok,
      timestamp: new Date().toISOString(),
    })

    if (res.status === 401) {
      console.error('[API] Unauthorized error')
      throw new Error('UNAUTHORIZED')
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      console.error('[API] Response not OK:', {
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
      console.error('[API] No reader available')
      throw new Error('No reader available')
    }

    try {
      let buffer = ''
      console.log('[API] Starting stream reading')
      callbacks.onStartStreaming?.()

      while (true) {
        try {
          const { done, value } = await reader.read()
          if (done) {
            console.log('[API] Stream reading complete')
            break
          }

          const text = new TextDecoder().decode(value)
          buffer += text

          // Only trim when checking for script ID
          const trimmedBuffer = buffer.trim()
          const idMatch = trimmedBuffer.match(/__SCRIPT_ID__(.+?)__SCRIPT_ID__/)
          if (idMatch) {
            const scriptId = idMatch[1]
            console.log('[API] Script ID received:', scriptId)
            buffer = buffer.replace(/__SCRIPT_ID__.+?__SCRIPT_ID__/, '')
            callbacks.onScriptId?.(scriptId)
          }

          console.log('[API] Chunk received:', {
            chunkSize: text.length,
            totalBufferSize: buffer.length,
            timestamp: new Date().toISOString(),
          })
          callbacks.onChunk?.(buffer)
        } catch (readError) {
          console.error('[API] Error during stream read:', readError)
          if (signal.aborted) {
            console.log('[API] Stream aborted')
            return
          }
          // If we get a read error but have a buffer, we can still use it
          if (buffer) {
            console.log('[API] Using existing buffer despite read error')
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
        })
        callbacks.onChunk?.(buffer)
      }
    } finally {
      if (!signal.aborted) {
        console.log('[API] Cancelling reader')
        reader.cancel().catch(err => {
          console.error('[API] Error cancelling reader:', err)
        })
      }
    }
  } catch (error) {
    console.error('[API] Error in generateDraftWithStream:', error)
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
  extractReasoning: boolean = false
): Promise<void> {
  console.log('[API] Starting generateOpenRouterDraftWithStream:', {
    prompt,
    luckyRequestId,
    timestamp,
    isAborted: signal.aborted,
    extractReasoning,
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
        extractReasoning,
      }),
      signal,
    })

    console.log('[API] OpenRouter fetch response received:', {
      status: res.status,
      ok: res.ok,
      timestamp: new Date().toISOString(),
    })

    if (res.status === 401) {
      console.error('[API] Unauthorized error')
      throw new Error('UNAUTHORIZED')
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      console.error('[API] OpenRouter response not OK:', {
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
      console.error('[API] No reader available')
      throw new Error('No reader available')
    }

    try {
      let buffer = ''
      console.log('[API] Starting OpenRouter stream reading')
      callbacks.onStartStreaming?.()

      while (true) {
        try {
          const { done, value } = await reader.read()
          if (done) {
            console.log('[API] OpenRouter stream reading complete')
            break
          }

          const text = new TextDecoder().decode(value)
          buffer += text

          // Only trim when checking for script ID
          const trimmedBuffer = buffer.trim()
          const idMatch = trimmedBuffer.match(/__SCRIPT_ID__(.+?)__SCRIPT_ID__/)
          if (idMatch) {
            const scriptId = idMatch[1]
            console.log('[API] Script ID received:', scriptId)
            buffer = buffer.replace(/__SCRIPT_ID__.+?__SCRIPT_ID__/, '')
            callbacks.onScriptId?.(scriptId)
          }

          console.log('[API] OpenRouter chunk received:', {
            chunkSize: text.length,
            totalBufferSize: buffer.length,
            timestamp: new Date().toISOString(),
          })
          callbacks.onChunk?.(buffer)
        } catch (readError) {
          console.error('[API] Error during OpenRouter stream read:', readError)
          if (signal.aborted) {
            console.log('[API] OpenRouter stream aborted')
            return
          }
          // If we get a read error but have a buffer, we can still use it
          if (buffer) {
            console.log('[API] Using existing buffer despite read error')
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
        })
        callbacks.onChunk?.(buffer)
      }
    } finally {
      if (!signal.aborted) {
        console.log('[API] Cancelling OpenRouter reader')
        reader.cancel().catch(err => {
          console.error('[API] Error cancelling OpenRouter reader:', err)
        })
      }
    }
  } catch (error) {
    console.error('[API] Error in generateOpenRouterDraftWithStream:', error)
    const err = error instanceof Error ? error : new Error('Generation failed')
    callbacks.onError?.(err)
    throw err
  }
}

// Function to choose between implementations
export async function generateDraftWithProvider(
  provider: 'default' | 'openrouter',
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
  } else {
    return generateDraftWithStream(prompt, luckyRequestId, timestamp, signal, callbacks)
  }
}
