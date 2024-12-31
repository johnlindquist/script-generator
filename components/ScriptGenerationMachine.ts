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

const generateInitialScript = fromPromise(
  async ({
    input,
    emit,
  }: {
    input: ScriptGenerationContext
    emit: (event: ScriptGenerationEvent) => void
  }): Promise<GenerateInitialResponse> => {
    const response = await fetch('/api/generate-initial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: input.prompt, requestId: input.requestId }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.details || 'Failed to generate initial script')
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

      // Send partial text updates to the machine
      emit({ type: 'UPDATE_EDITABLE_SCRIPT', script: buffer })
    }

    if (!scriptId) {
      throw new Error('Failed to get script ID from initial generation')
    }

    return { script: buffer, scriptId }
  }
)

const generateRefinedScript = fromPromise(
  async ({
    input,
    emit,
  }: {
    input: ScriptGenerationContext
    emit: (event: ScriptGenerationEvent) => void
  }): Promise<string> => {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptId: input.scriptId }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.details || 'Failed to refine script')
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No reader available')
    }

    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = new TextDecoder().decode(value)
      buffer += text
      buffer = buffer.trim()

      // Send partial text updates to the machine
      emit({ type: 'UPDATE_EDITABLE_SCRIPT', script: buffer })
    }

    return buffer
  }
)

const saveScript = fromPromise(
  async ({ input }: { input: ScriptGenerationContext }): Promise<void> => {
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
  }
)

const saveAndInstallScript = fromPromise(
  async ({ input }: { input: ScriptGenerationContext }): Promise<void> => {
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

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://scriptkit.com'
    window.location.href = `/api/new?name=${encodeURIComponent(dashedName || 'script-name-not-found')}&url=${encodeURIComponent(`${baseUrl}/scripts/${id}/raw/${dashedName || 'script'}.ts`)}`
  }
)

export const scriptGenerationMachine = setup({
  types: {
    context: {} as ScriptGenerationContext,
    events: {} as ScriptGenerationEvent,
  },
  actors: {
    generateInitialScript,
    generateRefinedScript,
    saveScriptService: saveScript,
    saveAndInstallService: saveAndInstallScript,
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
        editableScript: () => '',
        requestId: () => crypto.randomUUID(),
      }),
      invoke: {
        src: 'generateInitialScript',
        input: ({ context }) => context,
        onDone: {
          target: 'generatingRefined',
          actions: assign({
            editableScript: ({ event }) => event.output.script,
            scriptId: ({ event }) => event.output.scriptId,
          }),
        },
        onError: {
          target: 'idle',
          actions: assign({
            error: ({ event }) => event.error as string,
          }),
        },
      },
      on: {
        CANCEL_GENERATION: { target: 'idle' },
        UPDATE_EDITABLE_SCRIPT: {
          actions: assign({
            editableScript: ({ event }) => event.script,
          }),
        },
      },
    },

    generatingRefined: {
      entry: assign({
        editableScript: () => '',
      }),
      invoke: {
        src: 'generateRefinedScript',
        input: ({ context }) => context,
        onDone: {
          target: 'done',
          actions: assign({
            editableScript: ({ event }) => event.output,
            generatedScript: ({ event }) => event.output,
          }),
        },
        onError: {
          target: 'idle',
          actions: assign({
            error: ({ event }) => event.error as string,
          }),
        },
      },
      on: {
        CANCEL_GENERATION: { target: 'idle' },
        UPDATE_EDITABLE_SCRIPT: {
          actions: assign({
            editableScript: ({ event }) => event.script,
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
            error: ({ event }) => event.error as string,
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
            error: ({ event }) => event.error as string,
          }),
        },
      },
    },
  },
})
