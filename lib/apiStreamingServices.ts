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
  input: StreamingServiceInput,
  emit: (event: ScriptGenerationEvent) => void
): Promise<StreamingServiceResult> => {
  return generateScript('/api/generate-final', input, emit)
}
