import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { interpret } from 'xstate'
import { scriptGenerationMachine } from '@/components/ScriptGenerationMachine'

describe('ScriptGenerationMachine', () => {
  let service: ReturnType<typeof interpret>

  beforeEach(() => {
    vi.resetAllMocks()
    service = interpret(scriptGenerationMachine, {
      systemId: 'test-script-generation-machine',
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
  })

  afterEach(() => {
    service.stop()
  })

  it('should start in the idle state', () => {
    expect(service.getSnapshot().value).toBe('idle')
  })

  it('should update prompt when SET_PROMPT event is sent', () => {
    const testPrompt = 'Test prompt'
    service.send({ type: 'SET_PROMPT', prompt: testPrompt })
    expect(service.getSnapshot().context.prompt).toBe(testPrompt)
  })

  it('should transition to thinkingDraft state when GENERATE_DRAFT is sent', () => {
    const timestamp = new Date().toISOString()
    service.send({ type: 'SET_PROMPT', prompt: 'Test prompt' })
    service.send({ type: 'GENERATE_DRAFT', timestamp })
    expect(service.getSnapshot().value).toBe('thinkingDraft')
  })

  it('should handle errors in generating state', () => {
    // Move to generating state
    const timestamp = new Date().toISOString()
    service.send({ type: 'SET_PROMPT', prompt: 'Test prompt' })
    service.send({ type: 'GENERATE_DRAFT', timestamp })
    service.send({ type: 'START_STREAMING_DRAFT' })

    // Set an error
    service.send({ type: 'SET_ERROR', error: 'Test error' })
    expect(service.getSnapshot().context.error).toBe('Test error')
  })

  it('should update usage count and limit', () => {
    const count = 5
    const limit = 10
    service.send({ type: 'SET_USAGE', count, limit })
    expect(service.getSnapshot().context.usageCount).toBe(count)
    expect(service.getSnapshot().context.usageLimit).toBe(limit)
  })

  it('should handle FROM_SUGGESTION event', () => {
    service.send({ type: 'FROM_SUGGESTION', value: true })
    expect(service.getSnapshot().context.isFromSuggestion).toBe(true)
    expect(service.getSnapshot().context.isFromLucky).toBe(false)
  })

  it('should handle UPDATE_EDITABLE_SCRIPT in generating state', () => {
    // Move to generating state
    const timestamp = new Date().toISOString()
    service.send({ type: 'SET_PROMPT', prompt: 'Test prompt' })
    service.send({ type: 'GENERATE_DRAFT', timestamp })
    service.send({ type: 'START_STREAMING_DRAFT' })

    // Update script
    const script = 'console.log("test")'
    service.send({ type: 'UPDATE_EDITABLE_SCRIPT', script })
    expect(service.getSnapshot().context.editableScript).toBe(script)
  })

  it('should cancel generation and reset state', () => {
    // Set up some state
    const timestamp = new Date().toISOString()
    service.send({ type: 'SET_PROMPT', prompt: 'Test prompt' })
    service.send({ type: 'GENERATE_DRAFT', timestamp })
    service.send({ type: 'START_STREAMING_DRAFT' })
    service.send({ type: 'UPDATE_EDITABLE_SCRIPT', script: 'test script' })

    // Cancel generation
    service.send({ type: 'CANCEL_GENERATION' })

    // Verify state is reset
    const snapshot = service.getSnapshot()
    expect(snapshot.value).toBe('idle')
    expect(snapshot.context.error).toBeNull()
    expect(snapshot.context.editableScript).toBe('')
    expect(snapshot.context.generatedScript).toBeNull()
    expect(snapshot.context.requestId).toBeNull()
    expect(snapshot.context.scriptId).toBeNull()
    expect(snapshot.context.isFromLucky).toBe(false)
    expect(snapshot.context.luckyRequestId).toBeNull()
    expect(snapshot.context.lastRefinementRequestId).toBeNull()
  })
})
