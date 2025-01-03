import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createActor, fromPromise, type AnyActorLogic } from 'xstate'
import { scriptGenerationMachine } from '@/components/ScriptGenerationMachine'

type Context = {
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

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock toast
vi.mock('react-hot-toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

// Mock interaction logger
vi.mock('@/lib/interaction-logger', () => ({
  logInteraction: vi.fn(),
}))

// Mock crypto.randomUUID
const mockUUID = '123e4567-e89b-12d3-a456-426614174000'
vi.spyOn(crypto, 'randomUUID').mockImplementation(() => mockUUID)

// Debug logging helper
const logStateAndContext = (service: ReturnType<typeof createActor>, prefix: string) => {
  const snapshot = service.getSnapshot()
  console.log(`${prefix} - State:`, snapshot.value)
  console.log(`${prefix} - Context:`, snapshot.context)
}

describe('ScriptGenerationMachine', () => {
  let service: ReturnType<typeof createActor>

  beforeEach(() => {
    vi.resetAllMocks()
    const machine = scriptGenerationMachine.provide({
      actors: {
        generateDraftScript: fromPromise(async ({ self }) => {
          console.log('generateDraftScript - Starting')
          self.send({ type: 'SET_SCRIPT_ID', scriptId: '123' })
          console.log('generateDraftScript - Sent SET_SCRIPT_ID')
          await new Promise(resolve => setTimeout(resolve, 100))
          self.send({ type: 'UPDATE_EDITABLE_SCRIPT', script: 'console.log("test")' })
          console.log('generateDraftScript - Sent UPDATE_EDITABLE_SCRIPT')
          await new Promise(resolve => setTimeout(resolve, 100))
          return { scriptId: '123' } as const
        }),
        generateFinalScript: fromPromise(async ({ self }) => {
          console.log('generateFinalScript - Starting')
          await new Promise(resolve => setTimeout(resolve, 100))
          self.send({ type: 'UPDATE_EDITABLE_SCRIPT', script: 'final script' })
          console.log('generateFinalScript - Sent UPDATE_EDITABLE_SCRIPT')
          await new Promise(resolve => setTimeout(resolve, 100))
          return { script: 'final script', scriptId: '123' } as const
        }),
        saveScriptService: fromPromise(async () => {
          console.log('saveScriptService - Starting')
          await new Promise(resolve => setTimeout(resolve, 100))
          return { success: true } as const
        }) as AnyActorLogic,
        saveAndInstallService: fromPromise(async () => {
          console.log('saveAndInstallService - Starting')
          await new Promise(resolve => setTimeout(resolve, 100))
          return { success: true } as const
        }) as AnyActorLogic,
      },
    })

    service = createActor(machine, {
      input: {
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
    }).start()

    console.log('Initial state:', service.getSnapshot().value)
    console.log('Initial context:', service.getSnapshot().context)
  })

  afterEach(() => {
    service.stop()
    vi.restoreAllMocks()
  })

  // Helper function to wait for state transitions
  const waitForTransition = async () => {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // Helper function to wait for a specific state
  const waitForState = async (state: string) => {
    let attempts = 0
    while (service.getSnapshot().value !== state && attempts < 10) {
      logStateAndContext(service, `waitForState(${state}) - Attempt ${attempts}`)
      await waitForTransition()
      attempts++
    }
    if (service.getSnapshot().value !== state) {
      logStateAndContext(service, `waitForState(${state}) - Failed`)
      throw new Error(`Failed to reach state ${state}`)
    }
    logStateAndContext(service, `waitForState(${state}) - Success`)
  }

  // Helper function to wait for a specific context value
  const waitForContext = async <K extends keyof Context>(key: K, value: Context[K]) => {
    let attempts = 0
    while (service.getSnapshot().context[key] !== value && attempts < 10) {
      logStateAndContext(
        service,
        `waitForContext(${String(key)}=${String(value)}) - Attempt ${attempts}`
      )
      await waitForTransition()
      attempts++
    }
    if (service.getSnapshot().context[key] !== value) {
      logStateAndContext(service, `waitForContext(${String(key)}=${String(value)}) - Failed`)
      throw new Error(`Failed to reach context value ${String(value)} for key ${String(key)}`)
    }
    logStateAndContext(service, `waitForContext(${String(key)}=${String(value)}) - Success`)
  }

  // Helper function to wait for a specific state and context value
  const waitForStateAndContext = async <K extends keyof Context>(
    state: string,
    key: K,
    value: Context[K]
  ) => {
    console.log(
      `waitForStateAndContext - Starting: state=${state}, ${String(key)}=${String(value)}`
    )
    await waitForState(state)
    await waitForContext(key, value)
    console.log(
      `waitForStateAndContext - Complete: state=${state}, ${String(key)}=${String(value)}`
    )
  }

  // Helper function to subscribe to state changes
  const subscribeToStateChanges = () => {
    return service.subscribe(snapshot => {
      console.log('State changed:', {
        state: snapshot.value,
        context: snapshot.context,
        event: snapshot.event,
      })
    })
  }

  // 1. Initial State Tests
  describe('Initial State', () => {
    it('should start in the idle state', () => {
      logStateAndContext(service, 'Initial State Test')
      expect(service.getSnapshot().value).toBe('idle')
    })

    it('should have default context values', () => {
      logStateAndContext(service, 'Default Context Test')
      const context = service.getSnapshot().context
      expect(context).toEqual({
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
      })
    })
  })

  // 2. Idle State Tests
  describe('Idle State', () => {
    it('should update prompt when SET_PROMPT event is sent', async () => {
      const subscription = subscribeToStateChanges()
      service.send({ type: 'SET_PROMPT', prompt: 'Test prompt' })
      await waitForContext('prompt', 'Test prompt')
      expect(service.getSnapshot().context.prompt).toBe('Test prompt')
      subscription.unsubscribe()
    })

    it('should handle FROM_SUGGESTION event', async () => {
      const subscription = subscribeToStateChanges()
      service.send({ type: 'FROM_SUGGESTION', value: true })
      await waitForContext('isFromSuggestion', true)
      expect(service.getSnapshot().context.isFromSuggestion).toBe(true)
      subscription.unsubscribe()
    })

    it('should transition to thinkingDraft on GENERATE_DRAFT', async () => {
      const subscription = subscribeToStateChanges()
      const timestamp = new Date().toISOString()
      service.send({ type: 'SET_PROMPT', prompt: 'Test prompt' })
      service.send({ type: 'GENERATE_DRAFT', timestamp })
      await waitForState('thinkingDraft')
      expect(service.getSnapshot().value).toBe('thinkingDraft')
      expect(service.getSnapshot().context.interactionTimestamp).toBe(timestamp)
      subscription.unsubscribe()
    })
  })

  // 3. Thinking Draft State Tests
  describe('Thinking Draft State', () => {
    beforeEach(async () => {
      const timestamp = new Date().toISOString()
      service.send({ type: 'SET_PROMPT', prompt: 'Test prompt' })
      service.send({ type: 'GENERATE_DRAFT', timestamp })
      await waitForState('thinkingDraft')
    })

    it('should clear error and scripts on entry', () => {
      const context = service.getSnapshot().context
      expect(context.error).toBeNull()
      expect(context.generatedScript).toBeNull()
      expect(context.editableScript).toBe('')
    })

    it('should transition to generatingDraft on START_STREAMING_DRAFT', async () => {
      service.send({ type: 'START_STREAMING_DRAFT' })
      await waitForState('generatingDraft')
      expect(service.getSnapshot().value).toBe('generatingDraft')
    })

    it('should return to idle on CANCEL_GENERATION', async () => {
      service.send({ type: 'CANCEL_GENERATION' })
      await waitForState('idle')
      expect(service.getSnapshot().value).toBe('idle')
    })
  })

  // 4. Generating Draft State Tests
  describe('Generating Draft State', () => {
    beforeEach(async () => {
      const timestamp = new Date().toISOString()
      service.send({ type: 'SET_PROMPT', prompt: 'Test prompt' })
      service.send({ type: 'GENERATE_DRAFT', timestamp })
      await waitForState('thinkingDraft')
      service.send({ type: 'START_STREAMING_DRAFT' })
      await waitForState('generatingDraft')
    })

    it('should handle successful script generation', async () => {
      service.send({ type: 'UPDATE_EDITABLE_SCRIPT', script: 'console.log("test")' })
      await waitForContext('scriptId', '123')
      await waitForState('generatingFinal')
      expect(service.getSnapshot().context.scriptId).toBe('123')
      expect(service.getSnapshot().context.editableScript).toBe('console.log("test")')
    })

    it('should handle generation errors', async () => {
      service.send({ type: 'SET_ERROR', error: 'API Error' })
      await waitForContext('error', 'API Error')
      const context = service.getSnapshot().context
      expect(context.error).toBe('API Error')
    })

    it('should handle UPDATE_EDITABLE_SCRIPT events', async () => {
      service.send({ type: 'UPDATE_EDITABLE_SCRIPT', script: 'partial script' })
      await waitForContext('editableScript', 'partial script')
      expect(service.getSnapshot().context.editableScript).toBe('partial script')
    })
  })

  // 5. Complete State Tests
  describe('Complete State', () => {
    beforeEach(async () => {
      const timestamp = new Date().toISOString()
      service.send({ type: 'SET_PROMPT', prompt: 'Test prompt' })
      service.send({ type: 'GENERATE_DRAFT', timestamp })
      await waitForState('thinkingDraft')
      service.send({ type: 'START_STREAMING_DRAFT' })
      await waitForState('generatingDraft')
      await waitForContext('scriptId', '123')
      service.send({ type: 'COMPLETE_GENERATION', script: 'final script' })
      await waitForStateAndContext('complete', 'generatedScript', 'final script')
    })

    it('should handle SAVE_SCRIPT', async () => {
      service.send({ type: 'SAVE_SCRIPT' })
      await waitForState('saving')
      expect(service.getSnapshot().context.generatedScript).toBe('final script')
    })

    it('should handle SAVE_AND_INSTALL', async () => {
      service.send({ type: 'SAVE_AND_INSTALL' })
      await waitForState('installing')
      expect(service.getSnapshot().context.generatedScript).toBe('final script')
    })

    it('should return to idle on RESET', async () => {
      service.send({ type: 'RESET' })
      await waitForState('idle')
      expect(service.getSnapshot().value).toBe('idle')
      expect(service.getSnapshot().context.generatedScript).toBeNull()
    })
  })

  // 6. Error Handling Tests
  describe('Error Handling', () => {
    beforeEach(async () => {
      const timestamp = new Date().toISOString()
      service.send({ type: 'SET_PROMPT', prompt: 'Test prompt' })
      service.send({ type: 'GENERATE_DRAFT', timestamp })
      await waitForState('thinkingDraft')
      service.send({ type: 'START_STREAMING_DRAFT' })
      await waitForState('generatingDraft')
    })

    it('should set and clear errors', async () => {
      service.send({ type: 'SET_ERROR', error: 'Test error' })
      await waitForContext('error', 'Test error')
      expect(service.getSnapshot().context.error).toBe('Test error')

      service.send({ type: 'CLEAR_ERROR' })
      await waitForContext('error', null)
      expect(service.getSnapshot().context.error).toBeNull()
    })

    it('should handle missing reader errors', async () => {
      service.send({ type: 'SET_ERROR', error: 'No reader available' })
      await waitForContext('error', 'No reader available')
      expect(service.getSnapshot().context.error).toBe('No reader available')
    })
  })

  // 7. Usage Tracking Tests
  describe('Usage Tracking', () => {
    it('should update usage count and limit', async () => {
      service.send({ type: 'SET_USAGE', count: 5, limit: 10 })
      await waitForContext('usageCount', 5)
      await waitForContext('usageLimit', 10)
      expect(service.getSnapshot().context.usageCount).toBe(5)
      expect(service.getSnapshot().context.usageLimit).toBe(10)
    })
  })

  // 8. Lucky Feature Tests
  describe('Lucky Feature', () => {
    it('should handle lucky request ID', async () => {
      service.send({ type: 'SET_LUCKY_REQUEST', requestId: 'lucky-123' })
      await waitForContext('luckyRequestId', 'lucky-123')
      await waitForContext('isFromLucky', true)
      expect(service.getSnapshot().context.luckyRequestId).toBe('lucky-123')
      expect(service.getSnapshot().context.isFromLucky).toBe(true)
    })
  })
})
