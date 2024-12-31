import { setup, assign, fromPromise } from 'xstate'
import { toast } from 'react-hot-toast'

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
}

interface GenerateInitialResponse {
  script: string
  scriptId: string
}

type ScriptGenerationEvent =
  | { type: 'SET_PROMPT'; prompt: string }
  | { type: 'GENERATE_INITIAL' }
  | { type: 'GENERATE_REFINED' }
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

const generateScript = async (
  url: string,
  input: ScriptGenerationContext,
  emit: (event: ScriptGenerationEvent) => void
) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: input.prompt,
      requestId: input.requestId,
      scriptId: input.scriptId,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.details || 'Failed to generate script')
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No reader available')
  }

  let buffer = ''
  let scriptId = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const text = new TextDecoder().decode(value)
    buffer += text
    buffer = buffer.trim()

    const idMatch = buffer.match(/__SCRIPT_ID__(.+?)__SCRIPT_ID__/)
    if (idMatch) {
      scriptId = idMatch[1]
      buffer = buffer.replace(/__SCRIPT_ID__.+?__SCRIPT_ID__/, '')
      emit({ type: 'SET_SCRIPT_ID', scriptId })
    }

    // Send partial text updates
    emit({ type: 'UPDATE_EDITABLE_SCRIPT', script: buffer })
  }

  return { script: buffer, scriptId }
}

export const scriptGenerationMachine = setup({
  types: {
    context: {} as ScriptGenerationContext,
    events: {} as ScriptGenerationEvent,
    input: {} as { prompt: string; requestId: string | null; scriptId: string | null },
    output: {} as { script: string; scriptId: string },
  },
  actors: {
    generateInitialScript: fromPromise(async ({ input, emit }) => {
      return generateScript('/api/generate-initial', input as ScriptGenerationContext, emit)
    }),
    generateRefinedScript: fromPromise(async ({ input, emit }) => {
      return generateScript('/api/generate', input as ScriptGenerationContext, emit)
    }),
    saveScriptService: fromPromise(async ({ input }: { input: ScriptGenerationContext }) => {
      const response = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input.prompt,
          code: input.editableScript,
          saved: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save script')
      }

      toast.success('Script saved successfully!')
      window.location.reload()
    }),
    saveAndInstallService: fromPromise(async ({ input }: { input: ScriptGenerationContext }) => {
      const response = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input.prompt,
          code: input.editableScript,
          saved: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save script')
      }

      const { id, dashedName } = await response.json()

      const installResponse = await fetch('/api/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId: id }),
      })

      if (!installResponse.ok) {
        throw new Error('Failed to track install')
      }

      toast.success('Script saved and installed successfully!')

      const baseUrl =
        typeof window !== 'undefined' ? window.location.origin : 'https://scriptkit.com'
      window.location.href = `/api/new?name=${encodeURIComponent(dashedName || 'script-name-not-found')}&url=${encodeURIComponent(`${baseUrl}/scripts/${id}/raw/${dashedName || 'script'}.ts`)}`
    }),
  },
}).createMachine({
  id: 'scriptGeneration',
  initial: 'idle',
  context: {
    prompt: '',
    editableScript: '',
    generatedScript: null,
    error: null,
    usageCount: 0,
    usageLimit: 25,
    requestId: null,
    isFromSuggestion: false,
    scriptId: null,
  },
  states: {
    idle: {
      on: {
        SET_PROMPT: {
          actions: assign({
            prompt: ({ event }) => event.prompt,
            isFromSuggestion: () => false,
          }),
        },
        FROM_SUGGESTION: {
          actions: assign({
            isFromSuggestion: ({ event }) => event.value,
          }),
        },
        GENERATE_INITIAL: [
          {
            target: 'generatingInitial',
            guard: ({ context }) =>
              context.prompt.trim().length >= 15 && context.usageCount < context.usageLimit,
          },
          {
            target: 'idle',
            actions: assign({
              error: () => 'Prompt too short or usage limit reached',
            }),
          },
        ],
        SET_USAGE: {
          actions: assign({
            usageCount: ({ event }) => event.count,
            usageLimit: ({ event }) => event.limit,
          }),
        },
      },
    },

    generatingInitial: {
      entry: assign({
        error: () => null,
        generatedScript: () => null,
        requestId: () => crypto.randomUUID(),
      }),
      invoke: {
        src: 'generateInitialScript',
        input: ({ context }) => context,
        onDone: {
          target: 'generatingRefined',
          actions: assign({
            scriptId: ({ event }) => (event.output as GenerateInitialResponse).scriptId,
          }),
        },
        onError: {
          target: 'idle',
          actions: assign({
            error: ({ event }) => {
              const error = event.error
              return error instanceof Error ? error.message : String(error)
            },
          }),
        },
      },
      on: {
        CANCEL_GENERATION: {
          target: 'idle',
          actions: assign({
            error: null,
            editableScript: '',
          }),
        },
        UPDATE_EDITABLE_SCRIPT: {
          actions: assign({
            editableScript: ({ event }) => event.script,
          }),
        },
        SET_ERROR: {
          actions: assign({
            error: ({ event }) => String(event.error),
          }),
        },
      },
    },

    generatingRefined: {
      invoke: {
        src: 'generateRefinedScript',
        input: ({ context }) => context,
        onDone: {
          target: 'done',
          actions: assign({
            editableScript: ({ event }) => (event.output as { script: string }).script,
            generatedScript: ({ event }) => (event.output as { script: string }).script,
          }),
        },
        onError: {
          target: 'idle',
          actions: assign({
            error: ({ event }) => {
              const error = event.error
              return error instanceof Error ? error.message : String(error)
            },
          }),
        },
      },
      on: {
        CANCEL_GENERATION: {
          target: 'idle',
          actions: assign({
            error: null,
            editableScript: '',
          }),
        },
        UPDATE_EDITABLE_SCRIPT: {
          actions: assign({
            editableScript: ({ event }) => event.script,
          }),
        },
        SET_ERROR: {
          actions: assign({
            error: ({ event }) => String(event.error),
          }),
        },
      },
    },

    done: {
      on: {
        SAVE_SCRIPT: { target: 'savingScript' },
        SAVE_AND_INSTALL: { target: 'saveAndInstall' },
        RESET: {
          target: 'idle',
          actions: assign({
            prompt: () => '',
            editableScript: () => '',
            generatedScript: () => null,
            error: () => null,
            scriptId: () => null,
          }),
        },
        UPDATE_EDITABLE_SCRIPT: {
          actions: assign({
            editableScript: ({ event }) => event.script,
          }),
        },
      },
    },

    savingScript: {
      invoke: {
        src: 'saveScriptService',
        input: ({ context }) => context,
        onDone: {
          target: 'idle',
          actions: assign({
            prompt: () => '',
            editableScript: () => '',
            generatedScript: () => null,
            scriptId: () => null,
          }),
        },
        onError: {
          target: 'done',
          actions: assign({
            error: ({ event }) => {
              const error = event.error
              return error instanceof Error ? error.message : String(error)
            },
          }),
        },
      },
    },

    saveAndInstall: {
      invoke: {
        src: 'saveAndInstallService',
        input: ({ context }) => context,
        onDone: {
          target: 'idle',
          actions: assign({
            prompt: () => '',
            editableScript: () => '',
            generatedScript: () => null,
            scriptId: () => null,
          }),
        },
        onError: {
          target: 'done',
          actions: assign({
            error: ({ event }) => {
              const error = event.error
              return error instanceof Error ? error.message : String(error)
            },
          }),
        },
      },
    },
  },
})
