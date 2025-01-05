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
  onError?: (error: Error) => void
}

export async function generateDraftWithStream(
  prompt: string,
  luckyRequestId: string | null,
  timestamp: string,
  signal: AbortSignal,
  callbacks: StreamCallbacks = {}
): Promise<void> {
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

    if (res.status === 401) {
      throw new Error('UNAUTHORIZED')
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to generate draft')
    }

    const reader = res.body?.getReader()
    if (!reader) {
      throw new Error('No reader available')
    }

    try {
      let buffer = ''
      callbacks.onStartStreaming?.()

      while (true) {
        try {
          const { done, value } = await reader.read()
          if (done) break

          const text = new TextDecoder().decode(value)
          buffer += text

          // Only trim when checking for script ID
          const trimmedBuffer = buffer.trim()
          const idMatch = trimmedBuffer.match(/__SCRIPT_ID__(.+?)__SCRIPT_ID__/)
          if (idMatch) {
            const scriptId = idMatch[1]
            buffer = buffer.replace(/__SCRIPT_ID__.+?__SCRIPT_ID__/, '')
            callbacks.onScriptId?.(scriptId)
          }

          callbacks.onChunk?.(buffer)
        } catch {
          if (signal.aborted) {
            return
          }
          // If we get a read error but have a buffer, we can still use it
          if (buffer) {
            callbacks.onChunk?.(buffer)
          }
          break
        }
      }

      // Only proceed if we have a valid buffer and haven't been aborted
      if (buffer && !signal.aborted) {
        callbacks.onChunk?.(buffer)
      }
    } finally {
      if (!signal.aborted) {
        reader.cancel().catch(() => {})
      }
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Generation failed')
    callbacks.onError?.(err)
    throw err
  }
}
