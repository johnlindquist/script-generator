import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createMockStream,
  createMockResponse,
  createMockErrorResponse,
  testMockStreaming,
  generateMockScriptContent,
} from '@/lib/mock-streaming'
import { mockScripts, errorTypes } from '@/lib/mock-scripts'

describe('Mock Streaming', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createMockStream', () => {
    it('should create a valid ReadableStream', () => {
      const stream = createMockStream({
        scriptId: 'test-123',
        scenario: 'short',
      })

      expect(stream).toBeInstanceOf(ReadableStream)
    })

    it('should stream script ID first', async () => {
      const chunks: string[] = []
      const stream = createMockStream({
        scriptId: 'test-123',
        scenario: 'short',
        onChunk: chunk => chunks.push(chunk),
      })

      const reader = stream.getReader()
      const decoder = new TextDecoder()

      // Read first chunk
      const { value } = await reader.read()
      const firstChunk = decoder.decode(value)

      expect(firstChunk).toBe('__SCRIPT_ID__test-123__SCRIPT_ID__')
      expect(chunks[0]).toBe('__SCRIPT_ID__test-123__SCRIPT_ID__')

      reader.cancel()
    })

    it('should stream content in chunks', async () => {
      const result = await testMockStreaming({
        scriptId: 'test-123',
        scenario: 'short',
        chunkSize: 10,
        delayMs: 0,
      })

      expect(result.chunks.length).toBeGreaterThan(2) // ID chunk + content chunks
      expect(result.chunks[0]).toBe('__SCRIPT_ID__test-123__SCRIPT_ID__')
      expect(result.fullContent).toContain('import "@johnlindquist/kit"')
      expect(result.error).toBeUndefined()
    })

    it('should handle error injection', async () => {
      const result = await testMockStreaming({
        scriptId: 'test-123',
        scenario: 'short',
        error: 'network_timeout',
        errorAfterChunks: 3,
      })

      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Network timeout')
      expect(result.chunks.length).toBeLessThan(5) // Should stop after error
    })

    it('should handle error injection point in content', async () => {
      const result = await testMockStreaming({
        scriptId: 'test-123',
        scenario: 'error_midstream',
        error: 'server_error',
      })

      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Internal server error')
      expect(result.fullContent).not.toContain('__ERROR_INJECTION_POINT__')
      expect(result.fullContent).not.toContain("This won't execute")
    })

    it('should respect custom chunk sizes', async () => {
      const result = await testMockStreaming({
        scriptId: 'test-123',
        scenario: 'short',
        chunkSize: 5,
        delayMs: 0,
      })

      // Check that non-ID chunks are 5 characters or less
      const contentChunks = result.chunks.slice(1)
      contentChunks.forEach((chunk, index) => {
        if (index < contentChunks.length - 1) {
          expect(chunk.length).toBe(5)
        } else {
          // Last chunk might be smaller
          expect(chunk.length).toBeLessThanOrEqual(5)
        }
      })
    })

    it('should handle slow streaming', async () => {
      const startTime = Date.now()
      const result = await testMockStreaming({
        scriptId: 'test-123',
        scenario: 'instant',
        chunkSize: 10,
        delayMs: 50, // 50ms between chunks
      })

      const duration = Date.now() - startTime
      const expectedMinDuration = (result.chunks.length - 1) * 50

      expect(duration).toBeGreaterThanOrEqual(expectedMinDuration - 10) // Allow small variance
      expect(result.error).toBeUndefined()
    })

    it('should handle unicode content correctly', async () => {
      const result = await testMockStreaming({
        scriptId: 'test-123',
        scenario: 'unicode_stress',
      })

      expect(result.fullContent).toContain('😀')
      expect(result.fullContent).toContain('café')
      expect(result.fullContent).toContain('北京')
      expect(result.fullContent).toContain('∑(n=1 to ∞)')
      expect(result.error).toBeUndefined()
    })
  })

  describe('createMockResponse', () => {
    it('should create proper response with headers', () => {
      const stream = createMockStream({
        scriptId: 'test-123',
        scenario: 'short',
      })
      const response = createMockResponse(stream)

      expect(response).toBeInstanceOf(Response)
      expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
      expect(response.headers.get('Transfer-Encoding')).toBe('chunked')
      expect(response.headers.get('X-Mock-Response')).toBe('true')
      expect(response.body).toBe(stream)
    })
  })

  describe('createMockErrorResponse', () => {
    it('should create error responses with correct status codes', () => {
      const testCases = [
        { type: 'network_timeout' as const, status: 408 },
        { type: 'rate_limit' as const, status: 429 },
        { type: 'auth_failed' as const, status: 401 },
        { type: 'server_error' as const, status: 500 },
        { type: 'invalid_prompt' as const, status: 400 },
      ]

      testCases.forEach(({ type, status }) => {
        const response = createMockErrorResponse(type)
        expect(response.status).toBe(status)
        expect(response.headers.get('Content-Type')).toBe('application/json')
        expect(response.headers.get('X-Mock-Response')).toBe('true')
      })
    })

    it('should include error details in response body', async () => {
      const response = createMockErrorResponse('rate_limit')
      const body = await response.json()

      expect(body).toEqual({
        error: 'Rate limit exceeded. Please try again later.',
        code: 'RATE_LIMIT',
        mock: true,
      })
    })
  })

  describe('generateMockScriptContent', () => {
    it('should generate short simple script', () => {
      const script = generateMockScriptContent({
        length: 'short',
        complexity: 'simple',
      })

      expect(script).toContain('import "@johnlindquist/kit"')
      expect(script).toContain('await arg')
      expect(script).toContain('await say')
      expect(script.split('\n').length).toBeLessThan(10)
    })

    it('should generate long complex script', () => {
      const script = generateMockScriptContent({
        length: 'long',
        complexity: 'complex',
        includeComments: true,
      })

      expect(script).toContain('import "@johnlindquist/kit"')
      expect(script).toContain('import { readFile, writeFile }')
      expect(script).toContain('// Generated mock script')
      expect(script).toContain('await readdir')
      expect(script).toContain('System Information')
      expect(script.split('\n').length).toBeGreaterThan(20)
    })

    it('should respect includeImports option', () => {
      const script = generateMockScriptContent({
        length: 'short',
        includeImports: false,
      })

      expect(script).not.toContain('import')
    })

    it('should handle moderate complexity', () => {
      const script = generateMockScriptContent({
        length: 'medium',
        complexity: 'moderate',
      })

      expect(script).toContain('switch')
      expect(script).toContain('case')
      expect(script).toContain('await notify')
    })
  })

  describe('Mock Script Scenarios', () => {
    it('should have all required scenarios', () => {
      const requiredScenarios = [
        'short',
        'long',
        'error_midstream',
        'slow_stream',
        'instant',
        'unicode_stress',
      ]

      requiredScenarios.forEach(scenario => {
        expect(mockScripts).toHaveProperty(scenario)
        const script = mockScripts[scenario as keyof typeof mockScripts]
        expect(script).toHaveProperty('id')
        expect(script).toHaveProperty('name')
        expect(script).toHaveProperty('description')
        expect(script).toHaveProperty('content')
      })
    })

    it('should have valid Script Kit content in all scenarios', () => {
      Object.values(mockScripts).forEach(script => {
        if (!script.content.includes('__ERROR_INJECTION_POINT__')) {
          expect(script.content).toContain('import "@johnlindquist/kit"')
          expect(script.content).toMatch(/await \w+/) // Has await calls
        }
      })
    })
  })

  describe('Error Types', () => {
    it('should have all required error types', () => {
      const requiredErrors = [
        'network_timeout',
        'rate_limit',
        'auth_failed',
        'server_error',
        'invalid_prompt',
      ]

      requiredErrors.forEach(errorType => {
        expect(errorTypes).toHaveProperty(errorType)
        const error = errorTypes[errorType as keyof typeof errorTypes]
        expect(error).toHaveProperty('message')
        expect(error).toHaveProperty('code')
        expect(error).toHaveProperty('status')
      })
    })
  })

  describe('Stream Timing', () => {
    it('should track timing between chunks', async () => {
      const result = await testMockStreaming({
        scriptId: 'test-123',
        scenario: 'short',
        chunkSize: 10,
        delayMs: 20,
      })

      expect(result.timing.length).toBeGreaterThan(0)
      // First timing is from start, others should be ~20ms
      // Allow more variance for CI environments
      result.timing.slice(1).forEach(time => {
        expect(time).toBeGreaterThanOrEqual(10) // Allow variance
        expect(time).toBeLessThanOrEqual(100) // More tolerant for CI
      })
    })
  })
})
