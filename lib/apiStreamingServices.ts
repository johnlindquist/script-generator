import { ScriptGenerationEvent } from '@/types/scriptGeneration'
import { logInteraction } from '@/lib/interaction-logger'
import { generateDraft } from '@/lib/apiService'
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
    throw new Error('Unknown endpoint')
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
      // Only log a warning if the script is empty and has a reasonable length
      // This helps avoid false positives during initial generation or fast refreshes
      const MIN_SCRIPT_LENGTH_THRESHOLD = 50
      if (result.script.length > MIN_SCRIPT_LENGTH_THRESHOLD) {
        console.warn('[OpenRouter] Empty script returned from generateOpenRouterDraft')
      } else {
        console.log('[OpenRouter] Script appears empty but may be incomplete', {
          scriptLength: result.script.length,
        })
      }
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
