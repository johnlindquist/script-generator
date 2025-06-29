import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { MockedFunction } from 'vitest'

// Create mock localStorage object
const mockLocalStorage = {
  getItem: vi.fn() as MockedFunction<typeof localStorage.getItem>,
  setItem: vi.fn() as MockedFunction<typeof localStorage.setItem>,
  removeItem: vi.fn() as MockedFunction<typeof localStorage.removeItem>,
}

// Mock safeLocalStorage before importing the module that uses it
vi.mock('@/lib/event-handlers', () => ({
  safeLocalStorage: mockLocalStorage,
}))

import {
  getMockConfig,
  setMockConfig,
  clearMockConfig,
  getStreamingFetch,
  enableMockStreaming,
  disableMockStreaming,
} from '@/lib/mock-integration'

describe('Mock Integration', () => {
  const originalWindow = (global as any).window
  const originalLocation = (global as any).window?.location

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment variables
    delete process.env.MOCK_STREAMING
    delete process.env.MOCK_SCENARIO
    delete process.env.MOCK_ERROR
  })

  afterEach(() => {
    if (originalWindow) {
      (global as any).window = originalWindow
      if (originalLocation) {
        (global as any).window.location = originalLocation
      }
    }
  })

  describe('getMockConfig', () => {
    it('should return disabled by default', () => {
      const config = getMockConfig()
      expect(config.enabled).toBe(false)
    })

    it('should read from environment variables on server', () => {
      // Simulate server environment
      const windowBackup = (global as any).window
      delete (global as any).window

      process.env.MOCK_STREAMING = 'true'
      process.env.MOCK_SCENARIO = 'long'
      process.env.MOCK_ERROR = 'rate_limit'
      process.env.MOCK_ERROR_AFTER = '5'
      process.env.MOCK_CHUNK_SIZE = '20'
      process.env.MOCK_DELAY_MS = '100'

      const config = getMockConfig()

      expect(config).toEqual({
        enabled: true,
        scenario: 'long',
        error: 'rate_limit',
        errorAfterChunks: 5,
        chunkSize: 20,
        delayMs: 100,
      })

      // Restore window
      (global as any).window = windowBackup
    })

    it('should read from localStorage on client', () => {
      const mockConfig = {
        enabled: true,
        scenario: 'short',
        error: 'auth_failed',
      }

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockConfig))

      const config = getMockConfig()

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('mockStreamingConfig')
      expect(config).toEqual(mockConfig)
    })

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })

      const config = getMockConfig()

      expect(config.enabled).toBe(false)
    })

    it('should read from URL parameters', () => {
      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: {
          search: '?mock=true&mock_scenario=slow_stream&mock_error=network_timeout&mock_error_after=3',
        },
        writable: true,
      })

      const config = getMockConfig()

      expect(config).toEqual({
        enabled: true,
        scenario: 'slow_stream',
        error: 'network_timeout',
        errorAfterChunks: 3,
        chunkSize: undefined,
        delayMs: undefined,
      })
    })

    it('should prioritize localStorage over URL params', () => {
      const storedConfig = {
        enabled: true,
        scenario: 'long',
      }

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedConfig))

      Object.defineProperty(window, 'location', {
        value: {
          search: '?mock=true&mock_scenario=short',
        },
        writable: true,
      })

      const config = getMockConfig()

      expect(config).toEqual(storedConfig)
    })
  })

  describe('setMockConfig and clearMockConfig', () => {
    it('should save config to localStorage', () => {
      const config = {
        enabled: true,
        scenario: 'unicode_stress' as const,
        chunkSize: 50,
      }

      setMockConfig(config)

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'mockStreamingConfig',
        JSON.stringify(config)
      )
    })

    it('should clear config from localStorage', () => {
      clearMockConfig()

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('mockStreamingConfig')
    })

    it('should not throw on server', () => {
      const windowBackup = (global as any).window
      delete (global as any).window

      expect(() => setMockConfig({ enabled: true })).not.toThrow()
      expect(() => clearMockConfig()).not.toThrow()

      (global as any).window = windowBackup
    })
  })

  describe('getStreamingFetch', () => {
    const originalFetch = global.fetch

    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue(new Response())
    })

    afterEach(() => {
      global.fetch = originalFetch
    })

    it('should return regular fetch when disabled', () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const streamingFetch = getStreamingFetch()

      expect(streamingFetch).toBe(fetch)
    })

    it('should return mock fetch when enabled', async () => {
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          enabled: true,
          scenario: 'short',
        })
      )

      Object.defineProperty(window, 'location', {
        value: {
          origin: 'http://localhost:3000',
        },
        writable: true,
      })

      const streamingFetch = getStreamingFetch()

      // Test streaming endpoint
      await streamingFetch('/api/generate-ai-gateway', {
        method: 'POST',
        body: JSON.stringify({ prompt: 'test' }),
      })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/generate-ai-gateway/mock'),
        expect.any(Object)
      )

      const callUrl = vi.mocked(global.fetch).mock.calls[0][0] as string
      expect(callUrl).toContain('scenario=short')
      expect(callUrl).toContain('skip_db=false')
    })

    it('should add all mock parameters to URL', async () => {
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          enabled: true,
          scenario: 'long',
          error: 'rate_limit',
          errorAfterChunks: 10,
          chunkSize: 25,
          delayMs: 50,
        })
      )

      Object.defineProperty(window, 'location', {
        value: {
          origin: 'http://localhost:3000',
        },
        writable: true,
      })

      const streamingFetch = getStreamingFetch()

      await streamingFetch('/api/generate-ai-gateway', { method: 'POST' })

      const callUrl = vi.mocked(global.fetch).mock.calls[0][0] as string
      expect(callUrl).toContain('scenario=long')
      expect(callUrl).toContain('error=rate_limit')
      expect(callUrl).toContain('error_after=10')
      expect(callUrl).toContain('chunk_size=25')
      expect(callUrl).toContain('delay_ms=50')
    })

    it('should not mock non-streaming endpoints', async () => {
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({ enabled: true })
      )

      const streamingFetch = getStreamingFetch()

      await streamingFetch('/api/scripts', { method: 'GET' })

      expect(global.fetch).toHaveBeenCalledWith('/api/scripts', expect.any(Object))
    })

    it('should handle URL objects', async () => {
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({ enabled: true })
      )

      Object.defineProperty(window, 'location', {
        value: {
          origin: 'http://localhost:3000',
        },
        writable: true,
      })

      const streamingFetch = getStreamingFetch()
      const url = new URL('/api/generate-ai-gateway', 'http://localhost:3000')

      await streamingFetch(url, { method: 'POST' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/generate-ai-gateway/mock'),
        expect.any(Object)
      )
    })
  })

  describe('enableMockStreaming and disableMockStreaming', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    afterEach(() => {
      consoleSpy.mockClear()
    })

    it('should enable mock with default scenario', () => {
      enableMockStreaming()

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'mockStreamingConfig',
        JSON.stringify({
          enabled: true,
          scenario: 'short',
          error: undefined,
        })
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ Mock streaming enabled')
      )
    })

    it('should enable mock with custom scenario and error', () => {
      enableMockStreaming('long', 'server_error')

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'mockStreamingConfig',
        JSON.stringify({
          enabled: true,
          scenario: 'long',
          error: 'server_error',
        })
      )
    })

    it('should disable mock', () => {
      disableMockStreaming()

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('mockStreamingConfig')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Mock streaming disabled')
      )
    })
  })

  describe('Window integration', () => {
    it('should expose __mockStreaming in development', async () => {
      const originalEnv = process.env.NODE_ENV
      vi.stubEnv('NODE_ENV', 'development')

      // Re-import to trigger window setup
      vi.resetModules()
      vi.doMock('@/lib/event-handlers', () => ({
        safeLocalStorage: mockLocalStorage,
      }))
      
      await import('@/lib/mock-integration')
      
      expect(window).toHaveProperty('__mockStreaming')
      const mockStreaming = (window as any).__mockStreaming
      
      expect(mockStreaming).toHaveProperty('enable')
      expect(mockStreaming).toHaveProperty('disable')
      expect(mockStreaming).toHaveProperty('config')
      expect(mockStreaming).toHaveProperty('setConfig')
      expect(mockStreaming).toHaveProperty('scenarios')
      expect(mockStreaming).toHaveProperty('errors')
      
      vi.unstubAllEnvs()
    })
  })
})