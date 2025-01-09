import { setup, assign, fromPromise } from 'xstate'
import { toast } from 'react-hot-toast'
import { logInteraction } from '@/lib/interaction-logger'
import { saveScript, saveAndInstallScript } from '@/lib/apiService'
import { generateDraftWithStream, generateFinalWithStream } from '@/lib/apiStreamingServices'
import { ScriptGenerationEvent } from '@/types/scriptGeneration'

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
 * @property {boolean} isTransitioningToFinal - Indicates whether the generation is transitioning to final
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
  isTransitioningToFinal: boolean
}

/**
 * Response type for the initial script generation
 */
interface GenerateInitialResponse {
  scriptId: string
}

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

export const scriptGenerationMachine = setup({
  types: {
    context: {} as ScriptGenerationContext,
    events: {} as ScriptGenerationEvent,
    input: {} as ScriptGenerationContext,
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
      return generateDraftWithStream(typedInput, emit)
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
      try {
        const result = await generateFinalWithStream(
          {
            prompt: typedInput.prompt,
            requestId: typedInput.requestId,
            luckyRequestId: typedInput.luckyRequestId,
            interactionTimestamp: typedInput.interactionTimestamp || new Date().toISOString(),
            scriptId: typedInput.scriptId,
            editableScript: typedInput.editableScript,
          },
          {
            onStartStreaming: () => {
              emit({ type: 'START_STREAMING_FINAL' } as ScriptGenerationEvent)
            },
            onChunk: text => {
              emit({ type: 'UPDATE_EDITABLE_SCRIPT', script: text } as ScriptGenerationEvent)
            },
            onError: error => {
              if (error.message === 'UNAUTHORIZED') {
                window.location.href = '/sign-in'
                return
              }
              emit({ type: 'SET_ERROR', error: error.message } as ScriptGenerationEvent)
            },
          }
        )
        return result
      } catch (error) {
        if (error instanceof Response && error.status === 429) {
          emit({
            type: 'SET_ERROR',
            error: 'Daily generation limit reached. Try again tomorrow!',
          } as ScriptGenerationEvent)
        } else {
          emit({
            type: 'SET_ERROR',
            error: error instanceof Error ? error.message : 'Failed to generate final script',
          } as ScriptGenerationEvent)
        }
        throw error
      }
    }),
    saveScriptService: fromPromise(async ({ input }) => {
      const typedInput = input as ScriptGenerationContext
      if (typedInput.interactionTimestamp) {
        await logInteraction(typedInput.interactionTimestamp, 'stateMachine', 'Saving script', {
          scriptId: typedInput.scriptId,
        })
      }
      await saveScript(typedInput.prompt, typedInput.editableScript)
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
      await saveAndInstallScript(typedInput.prompt, typedInput.editableScript)
      toast.success('Script saved and installed successfully!')
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
    isTransitioningToFinal: false,
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
          isTransitioningToFinal: false,
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
              prompt: ({ event }) => (event as { type: 'SET_PROMPT'; prompt: string }).prompt,
              isFromSuggestion: () => false,
            }),
            createLogAction('Prompt set', context => ({ prompt: context.prompt })),
          ],
        },
        FROM_SUGGESTION: {
          actions: [
            assign({
              isFromSuggestion: ({ event }) =>
                (event as { type: 'FROM_SUGGESTION'; value: boolean }).value,
            }),
            createLogAction('Suggestion status updated', context => ({
              isFromSuggestion: context.isFromSuggestion,
            })),
          ],
        },
        SET_LUCKY_REQUEST: {
          actions: [
            assign({
              luckyRequestId: ({ event }) =>
                (event as { type: 'SET_LUCKY_REQUEST'; requestId: string }).requestId,
              isFromLucky: () => true,
            }),
            createLogAction('Lucky request ID set', context => ({
              luckyRequestId: context.luckyRequestId,
            })),
          ],
        },
        GENERATE_DRAFT: {
          target: 'thinkingDraft',
          actions: [
            assign({
              interactionTimestamp: ({ event }) =>
                (event as { type: 'GENERATE_DRAFT'; timestamp: string }).timestamp,
              requestId: () => Math.random().toString(36).substring(7),
            }),
          ],
        },
        UPDATE_EDITABLE_SCRIPT: {
          actions: [
            assign({
              editableScript: ({ event }) =>
                (event as { type: 'UPDATE_EDITABLE_SCRIPT'; script: string }).script,
            }),
          ],
        },
        SET_ERROR: {
          actions: [
            assign({
              error: ({ event }) => (event as { type: 'SET_ERROR'; error: string }).error,
            }),
          ],
        },
        SET_SCRIPT_ID: {
          actions: [
            assign({
              scriptId: ({ event }) =>
                (event as { type: 'SET_SCRIPT_ID'; scriptId: string }).scriptId,
            }),
          ],
        },
        SET_USAGE: {
          actions: [
            assign({
              usageCount: ({ event }) => (event as { type: 'SET_USAGE'; count: number }).count,
              usageLimit: ({ event }) => (event as { type: 'SET_USAGE'; limit: number }).limit,
            }),
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
          target: 'generatingFinal',
          actions: [
            assign(({ event }) => ({
              error: null,
              scriptId: (event as { output: GenerateInitialResponse }).output.scriptId,
              lastRefinementRequestId: crypto.randomUUID(),
              isTransitioningToFinal: true,
            })),
            createLogAction('Draft generation complete', context => ({
              scriptId: context.scriptId,
              requestId: context.requestId,
            })),
          ],
          guard: ({ context }: { context: ScriptGenerationContext }) =>
            !context.isTransitioningToFinal,
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

    generatingFinal: {
      entry: [
        ({ context }) => {
          if (context.interactionTimestamp) {
            logStateTransition('generatingFinal', context.interactionTimestamp, {
              scriptId: context.scriptId,
              message: 'Starting final script generation',
            }).catch(console.error)
          }
        },
      ],
      invoke: {
        id: 'generateFinalScript',
        src: 'generateFinalScript',
        input: ({ context }) => context,
        onDone: {
          target: 'complete',
          actions: [
            assign({
              error: null,
              generatedScript: ({ event }) => {
                const output = event.output as { script: string }
                return output.script
              },
              editableScript: ({ event }) => {
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
                const error = event.error as Error
                return error?.message || 'An unknown error occurred'
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
        START_STREAMING_FINAL: {
          guard: ({ context }: { context: ScriptGenerationContext }) =>
            !context.isTransitioningToFinal,
        },
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
      entry: [
        assign({
          isTransitioningToFinal: false,
        }),
        ({ context }) => {
          if (context.interactionTimestamp) {
            logStateTransition('complete', context.interactionTimestamp, {
              scriptId: context.scriptId,
            }).catch(console.error)
          }
        },
      ],
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
