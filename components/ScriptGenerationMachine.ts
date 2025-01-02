import { setup, assign, fromPromise } from 'xstate'
import { toast } from 'react-hot-toast'
import { logInteraction } from '@/lib/interaction-logger'

/**
 * The contextual data for the scriptGenerationMachine.
 * @property {string} prompt - The user input prompt or existing script content
 * @property {string} editableScript - The script content in the editor while streaming or after generation
 * @property {string|null} generatedScript - Finalized script after the generation completes
 * @property {string|null} error - Error message, if any
 * @property {number} usageCount - Current usage count for the day
 * @property {number} usageLimit - Max daily usage allowed
 * @property {string|null} requestId - Unique identifier for the current generation request
 * @property {boolean} isFromSuggestion - Indicates whether prompt is from a suggestion or direct user input
 * @property {string|null} scriptId - ID of the script record in the database
 * @property {string|null} interactionTimestamp - Timestamp used for logging interactions
 * @property {boolean} isFromLucky - Whether this is triggered from the "lucky" feature
 * @property {string|null} luckyRequestId - Unique ID for a lucky request, if relevant
 * @property {string|null} lastRefinementRequestId - Request ID used in the refine step
 */
interface ScriptGenerationContext {
  prompt: string
  editableScript: string
  generatedScript: string | null
  error: string | null
  usageCount: number
  usageLimit: number
  requestId: string | null
  isFromSuggestion: boolean
  scriptId: string | null
  interactionTimestamp: string | null
  isFromLucky: boolean
  luckyRequestId: string | null
  lastRefinementRequestId: string | null
}

/**
 * Response type for the initial script generation
 */
interface GenerateInitialResponse {
  scriptId: string
}

/**
 * All possible events that can be sent to the scriptGenerationMachine
 */
type ScriptGenerationEvent =
  | { type: 'SET_PROMPT'; prompt: string }
  | { type: 'GENERATE_DRAFT'; timestamp: string }
  | { type: 'START_STREAMING_DRAFT' }
  | { type: 'START_STREAMING_FINAL' }
  | { type: 'START_FINAL' }
  | { type: 'GENERATE_FINAL' }
  | { type: 'CANCEL_GENERATION' }
  | { type: 'SAVE_SCRIPT' }
  | { type: 'SAVE_AND_INSTALL' }
  | { type: 'RESET' }
  | { type: 'SET_USAGE'; count: number; limit: number }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'FROM_SUGGESTION'; value: boolean }
  | { type: 'UPDATE_EDITABLE_SCRIPT'; script: string }
  | { type: 'SET_SCRIPT_ID'; scriptId: string }
  | { type: 'COMPLETE_GENERATION'; script: string }
  | { type: 'SET_LUCKY_REQUEST'; requestId: string }

/**
 * Helper function to log state transitions
 */
async function logStateTransition(
  stateName: string,
  interactionTimestamp: string | null,
  details: Record<string, unknown> = {}
) {
  if (!interactionTimestamp) return
  await logInteraction(
    interactionTimestamp,
    'stateMachine',
    `Transitioning to ${stateName} state`,
    details
  )
}

/**
 * Helper function to create a logging action
 */
function createLogAction(
  message: string,
  getData?: (context: ScriptGenerationContext) => Record<string, unknown>
) {
  return ({ context }: { context: ScriptGenerationContext }) => {
    if (context.interactionTimestamp) {
      logStateTransition('action', context.interactionTimestamp, {
        message,
        ...(getData && { data: getData(context) }),
      }).catch(console.error)
    }
  }
}

/**
 * Generates a script by making a request to the specified endpoint and handling streaming responses
 */
const generateScript = async (
  url: string,
  input: ScriptGenerationContext,
  emit: (event: ScriptGenerationEvent) => void
) => {
  if (input.interactionTimestamp) {
    logInteraction(input.interactionTimestamp, 'stateMachine', 'Starting script generation', {
      url,
      prompt: input.prompt,
    })
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(input.interactionTimestamp && { 'Interaction-Timestamp': input.interactionTimestamp }),
    },
    body: JSON.stringify({
      prompt: input.prompt,
      requestId: input.requestId,
      scriptId: input.scriptId,
      luckyRequestId: input.luckyRequestId,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    const error = errorData.details || 'Failed to generate script'
    if (input.interactionTimestamp) {
      logInteraction(input.interactionTimestamp, 'stateMachine', 'Script generation failed', {
        error,
      })
    }
    throw new Error(error)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    const error = 'No reader available'
    if (input.interactionTimestamp) {
      logInteraction(input.interactionTimestamp, 'stateMachine', 'Script generation failed', {
        error,
      })
    }
    throw new Error(error)
  }

  let buffer = ''
  let scriptId = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const text = new TextDecoder().decode(value)
    buffer += text

    const trimmedBuffer = buffer.trim()
    const idMatch = trimmedBuffer.match(/__SCRIPT_ID__(.+?)__SCRIPT_ID__/)
    if (idMatch) {
      scriptId = idMatch[1]
      buffer = buffer.replace(/__SCRIPT_ID__.+?__SCRIPT_ID__/, '')
      emit({ type: 'SET_SCRIPT_ID', scriptId })
      if (input.interactionTimestamp) {
        logInteraction(input.interactionTimestamp, 'stateMachine', 'Script ID received', {
          scriptId,
        })
      }
    }

    // Send partial text updates
    emit({ type: 'UPDATE_EDITABLE_SCRIPT', script: buffer })
  }

  if (input.interactionTimestamp) {
    logInteraction(input.interactionTimestamp, 'stateMachine', 'Script generation completed', {
      scriptId,
    })
  }

  return { script: buffer, scriptId }
}

export const scriptGenerationMachine = setup({
  types: {
    context: {} as ScriptGenerationContext,
    events: {} as ScriptGenerationEvent,
    input: {} as ScriptGenerationContext,
    output: {} as GenerateInitialResponse,
  },
  actors: {
    generateDraftScript: fromPromise(async ({ input, emit }) => {
      const typedInput = input as ScriptGenerationContext
      if (typedInput.interactionTimestamp) {
        await logInteraction(
          typedInput.interactionTimestamp,
          'stateMachine',
          'Starting draft script generation',
          { prompt: typedInput.prompt }
        )
      }
      return generateScript('/api/generate-draft', typedInput, emit)
    }),
    generateFinalScript: fromPromise(async ({ input, emit }) => {
      const typedInput = input as ScriptGenerationContext
      if (typedInput.interactionTimestamp) {
        await logInteraction(
          typedInput.interactionTimestamp,
          'stateMachine',
          'Starting final script generation',
          { scriptId: typedInput.scriptId }
        )
      }
      return generateScript('/api/generate-final', typedInput, emit)
    }),
    saveScriptService: fromPromise(async ({ input }) => {
      const typedInput = input as ScriptGenerationContext
      if (typedInput.interactionTimestamp) {
        await logInteraction(typedInput.interactionTimestamp, 'stateMachine', 'Saving script', {
          scriptId: typedInput.scriptId,
        })
      }
      const response = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: typedInput.prompt,
          code: typedInput.editableScript,
          saved: true,
        }),
      })

      if (!response.ok) {
        const error = 'Failed to save script'
        if (typedInput.interactionTimestamp) {
          await logInteraction(
            typedInput.interactionTimestamp,
            'stateMachine',
            'Script save failed',
            { error }
          )
        }
        throw new Error(error)
      }

      toast.success('Script saved successfully!')
      window.location.reload()
    }),
    saveAndInstallService: fromPromise(async ({ input }) => {
      const typedInput = input as ScriptGenerationContext
      if (typedInput.interactionTimestamp) {
        await logInteraction(
          typedInput.interactionTimestamp,
          'stateMachine',
          'Saving and installing script',
          { scriptId: typedInput.scriptId }
        )
      }

      const response = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: typedInput.prompt,
          code: typedInput.editableScript,
          saved: true,
        }),
      })

      if (!response.ok) {
        const error = 'Failed to save script'
        if (typedInput.interactionTimestamp) {
          await logInteraction(
            typedInput.interactionTimestamp,
            'stateMachine',
            'Script save failed during install',
            { error }
          )
        }
        throw new Error(error)
      }

      const { id, dashedName } = await response.json()

      const installResponse = await fetch('/api/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId: id }),
      })

      if (!installResponse.ok) {
        const error = 'Failed to track install'
        if (typedInput.interactionTimestamp) {
          await logInteraction(
            typedInput.interactionTimestamp,
            'stateMachine',
            'Script install failed',
            { error, scriptId: id }
          )
        }
        throw new Error(error)
      }

      toast.success('Script saved and installed successfully!')

      const baseUrl =
        typeof window !== 'undefined' ? window.location.origin : 'https://scriptkit.com'
      window.location.href = `/api/new?name=${encodeURIComponent(dashedName || 'script-name-not-found')}&url=${encodeURIComponent(`${baseUrl}/scripts/${id}/raw/${dashedName || 'script'}.ts`)}`
    }),
  },
}).createMachine({
  /** The unique identifier for this state machine */
  id: 'scriptGeneration',
  /** Initial state where the machine waits for user input */
  initial: 'idle',
  context: {
    prompt: '',
    editableScript: '',
    generatedScript: null,
    error: null,
    usageCount: 0,
    usageLimit: 24,
    requestId: null,
    isFromSuggestion: false,
    scriptId: null,
    interactionTimestamp: null,
    isFromLucky: false,
    luckyRequestId: null,
    lastRefinementRequestId: null,
  },
  states: {
    /**
     * Idle state - waiting for user input or system events.
     * Handles prompt setting, usage updates, and initial generation triggers.
     */
    idle: {
      entry: [
        assign({
          error: null,
          editableScript: '',
          generatedScript: null,
          requestId: null,
          scriptId: null,
          isFromLucky: false,
          luckyRequestId: null,
          lastRefinementRequestId: null,
        }),
        ({ context }) => {
          if (context.interactionTimestamp) {
            logStateTransition('idle', context.interactionTimestamp).catch(console.error)
          }
        },
      ],
      on: {
        SET_PROMPT: {
          actions: [
            assign({
              prompt: ({ event }) => event.prompt,
              isFromSuggestion: () => false,
              isFromLucky: () => false,
              luckyRequestId: () => null,
            }),
            createLogAction('Prompt set', context => ({ prompt: context.prompt })),
          ],
        },
        FROM_SUGGESTION: {
          actions: [
            assign({
              isFromSuggestion: ({ event }) => event.value,
              isFromLucky: () => false,
              luckyRequestId: () => null,
            }),
            createLogAction('Suggestion status updated', context => ({
              isFromSuggestion: context.isFromSuggestion,
            })),
          ],
        },
        GENERATE_DRAFT: {
          target: 'thinkingDraft',
          actions: [
            assign({
              interactionTimestamp: ({ event }) => event.timestamp,
              requestId: () => Math.random().toString(36).substring(7),
            }),
          ],
        },
        SET_USAGE: {
          actions: [
            assign({
              usageCount: ({ event }) => event.count,
              usageLimit: ({ event }) => event.limit,
            }),
            createLogAction('Usage updated', context => ({
              usageCount: context.usageCount,
              usageLimit: context.usageLimit,
            })),
          ],
        },
      },
    },

    /**
     * Initial thinking state - preparing for generation.
     * Sets up request ID and clears previous state.
     */
    thinkingDraft: {
      entry: [
        assign({
          error: () => null,
          generatedScript: () => null,
          requestId: () => crypto.randomUUID(),
        }),
        ({ context }) => {
          if (context.interactionTimestamp) {
            logStateTransition('thinkingDraft', context.interactionTimestamp, {
              requestId: context.requestId,
            }).catch(console.error)
          }
        },
      ],
      on: {
        START_STREAMING_DRAFT: 'generatingDraft',
        CANCEL_GENERATION: 'idle',
      },
    },

    /**
     * Initial generation state - streaming the first version.
     * Handles the streaming response and updates.
     */
    generatingDraft: {
      entry: ({ context }) => {
        if (context.interactionTimestamp) {
          logStateTransition('generatingDraft', context.interactionTimestamp, {
            requestId: context.requestId,
          }).catch(console.error)
        }
      },
      invoke: {
        src: 'generateDraftScript',
        input: ({ context }) => context,
        onDone: {
          target: 'thinkingFinal',
          actions: [
            assign(({ event }) => ({
              error: null,
              scriptId: (event as { output: GenerateInitialResponse }).output.scriptId,
              lastRefinementRequestId: null,
            })),
            createLogAction('Draft generation complete', context => ({
              scriptId: context.scriptId,
              requestId: context.requestId,
            })),
          ],
        },
        onError: {
          target: 'idle',
          actions: [
            assign({
              error: ({ event }) => {
                const err = event.error as Error
                return err?.message || 'An unknown error occurred'
              },
              lastRefinementRequestId: () => null,
            }),
            createLogAction('Draft generation failed', context => ({
              error: context.error,
              requestId: context.requestId,
            })),
          ],
        },
      },
      on: {
        UPDATE_EDITABLE_SCRIPT: {
          actions: assign({
            editableScript: ({ event }) => event.script,
          }),
        },
        SET_ERROR: {
          actions: [
            assign({
              error: ({ event }) => String(event.error),
            }),
            createLogAction('Error during generation', context => ({ error: context.error })),
          ],
        },
        CANCEL_GENERATION: {
          target: 'idle',
          actions: [
            assign({
              error: null,
              editableScript: '',
              lastRefinementRequestId: null,
            }),
            createLogAction('Generation cancelled', context => ({ requestId: context.requestId })),
          ],
        },
      },
    },

    /**
     * Refined thinking state - preparing for refinement.
     * Similar to thinkingInitial but for refinement phase.
     */
    thinkingFinal: {
      entry: ({ context }) => {
        if (context.interactionTimestamp) {
          logStateTransition('thinkingFinal', context.interactionTimestamp, {
            scriptId: context.scriptId,
          }).catch(console.error)
        }
      },
      on: {
        START_STREAMING_FINAL: 'generatingFinal',
        CANCEL_GENERATION: 'idle',
      },
    },

    /**
     * Refined generation state - streaming the refined version.
     * Similar to generatingInitial but for refinement phase.
     */
    generatingFinal: {
      entry: ({ context }) => {
        if (context.interactionTimestamp) {
          logStateTransition('generatingFinal', context.interactionTimestamp, {
            scriptId: context.scriptId,
          }).catch(console.error)
        }
      },
      invoke: {
        src: 'generateFinalScript',
        input: ({ context }) => ({
          ...context,
          requestId: context.lastRefinementRequestId,
        }),
        onDone: {
          target: 'complete',
          actions: [
            assign({
              error: null,
              generatedScript: ({ event }) => {
                const output = event.output as { script: string }
                return output.script
              },
            }),
            createLogAction('Final generation complete', context => ({
              scriptId: context.scriptId,
            })),
          ],
        },
        onError: {
          target: 'idle',
          actions: [
            assign({
              error: ({ event }) => {
                const err = event.error as Error
                return err?.message || 'An unknown error occurred'
              },
              lastRefinementRequestId: null,
            }),
            createLogAction('Final generation failed', context => ({
              error: context.error,
              scriptId: context.scriptId,
            })),
          ],
        },
      },
      on: {
        UPDATE_EDITABLE_SCRIPT: {
          actions: assign({
            editableScript: ({ event }) => event.script,
          }),
        },
        SET_ERROR: {
          actions: [
            assign({
              error: ({ event }) => String(event.error),
            }),
            createLogAction('Error during generation', context => ({ error: context.error })),
          ],
        },
        CANCEL_GENERATION: {
          target: 'idle',
          actions: [
            assign({
              error: null,
              editableScript: '',
              lastRefinementRequestId: null,
            }),
            createLogAction('Final generation cancelled', context => ({
              scriptId: context.scriptId,
            })),
          ],
        },
      },
    },

    /**
     * Complete state - script generation finished.
     * Handles saving and installation options.
     */
    complete: {
      entry: ({ context }) => {
        if (context.interactionTimestamp) {
          logStateTransition('complete', context.interactionTimestamp, {
            scriptId: context.scriptId,
          }).catch(console.error)
        }
      },
      on: {
        RESET: {
          target: 'idle',
          actions: createLogAction('Reset to idle', context => ({ scriptId: context.scriptId })),
        },
        SAVE_SCRIPT: {
          target: 'saving',
          actions: createLogAction('Starting script save', context => ({
            scriptId: context.scriptId,
          })),
        },
        SAVE_AND_INSTALL: {
          target: 'installing',
          actions: createLogAction('Starting script save and install', context => ({
            scriptId: context.scriptId,
          })),
        },
      },
    },

    /**
     * Saving state - persisting the script.
     * Handles the save operation and related errors.
     */
    saving: {
      entry: ({ context }) => {
        if (context.interactionTimestamp) {
          logStateTransition('saving', context.interactionTimestamp, {
            scriptId: context.scriptId,
          }).catch(console.error)
        }
      },
      invoke: {
        src: 'saveScriptService',
        input: ({ context }) => context,
        onDone: {
          target: 'idle',
          actions: createLogAction('Script saved successfully', context => ({
            scriptId: context.scriptId,
          })),
        },
        onError: {
          target: 'complete',
          actions: [
            assign({
              error: ({ event }) => {
                const err = event.error as Error
                return err?.message || 'An unknown error occurred'
              },
            }),
            createLogAction('Script save failed', context => ({
              error: context.error,
              scriptId: context.scriptId,
            })),
          ],
        },
      },
    },

    /**
     * Installing state - saving and installing the script.
     * Handles both save and install operations and related errors.
     */
    installing: {
      entry: ({ context }) => {
        if (context.interactionTimestamp) {
          logStateTransition('installing', context.interactionTimestamp, {
            scriptId: context.scriptId,
          }).catch(console.error)
        }
      },
      invoke: {
        src: 'saveAndInstallService',
        input: ({ context }) => context,
        onDone: {
          target: 'idle',
          actions: createLogAction('Script installed successfully', context => ({
            scriptId: context.scriptId,
          })),
        },
        onError: {
          target: 'complete',
          actions: [
            assign({
              error: ({ event }) => {
                const err = event.error as Error
                return err?.message || 'An unknown error occurred'
              },
            }),
            createLogAction('Script installation failed', context => ({
              error: context.error,
              scriptId: context.scriptId,
            })),
          ],
        },
      },
    },
  },
})
