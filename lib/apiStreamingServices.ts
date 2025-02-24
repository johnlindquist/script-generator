import { ScriptGenerationEvent } from '@/types/scriptGeneration'
import { logInteraction } from '@/lib/interaction-logger'
import { generateDraft, generateFinal } from '@/lib/apiService'

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
  }
): Promise<{ script: string }> => {
  console.log('[API] Starting generateFinalWithStream:', {
    prompt: params.prompt,
    scriptId: params.scriptId,
    timestamp: params.interactionTimestamp,
  })

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
    })

    if (!response.ok) {
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

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No reader available')
    }

    let finalScript = ''
    let lastChunkEndsWithNewline = false

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = new TextDecoder().decode(value)

      // Handle line breaks at chunk boundaries
      if (lastChunkEndsWithNewline && chunk.startsWith('\n')) {
        finalScript = finalScript.slice(0, -1)
      }

      finalScript += chunk
      lastChunkEndsWithNewline = chunk.endsWith('\n')

      // Ensure proper line breaks around metadata comments
      finalScript = finalScript.replace(/^(\/\/ Name:.*?)(\n?)(\n?)(\/\/ Description:)/gm, '$1\n$4')
      finalScript = finalScript.replace(
        /^(\/\/ Description:.*?)(\n?)(\n?)(\/\/ Author:)/gm,
        '$1\n$4'
      )

      callbacks.onChunk(finalScript)
    }

    return { script: finalScript }
  } catch (error) {
    console.error('[API] Stream reading error:', error)
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
  }
}
