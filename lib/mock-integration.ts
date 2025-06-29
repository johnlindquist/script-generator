// Integration helper to use mock streaming in development
import { safeLocalStorage } from './event-handlers'

export interface MockConfig {
  enabled: boolean
  scenario?: 'short' | 'long' | 'error_midstream' | 'slow_stream' | 'instant' | 'unicode_stress'
  error?: 'network_timeout' | 'rate_limit' | 'auth_failed' | 'server_error' | 'invalid_prompt'
  errorAfterChunks?: number
  chunkSize?: number
  delayMs?: number
}

// Check if mock is enabled via environment or localStorage
export function getMockConfig(): MockConfig {
  // Server-side check
  if (typeof window === 'undefined') {
    return {
      enabled: process.env.MOCK_STREAMING === 'true',
      scenario: (process.env.MOCK_SCENARIO as MockConfig['scenario']) || 'short',
      error: process.env.MOCK_ERROR as MockConfig['error'],
      errorAfterChunks: process.env.MOCK_ERROR_AFTER
        ? parseInt(process.env.MOCK_ERROR_AFTER)
        : undefined,
      chunkSize: process.env.MOCK_CHUNK_SIZE ? parseInt(process.env.MOCK_CHUNK_SIZE) : undefined,
      delayMs: process.env.MOCK_DELAY_MS ? parseInt(process.env.MOCK_DELAY_MS) : undefined,
    }
  }

  // Client-side check - allows runtime configuration
  try {
    const stored = safeLocalStorage.getItem('mockStreamingConfig')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore localStorage errors
  }

  // Check URL params for override
  if (typeof window !== 'undefined' && window.location) {
    const params = new URLSearchParams(window.location.search)
    if (params.get('mock') === 'true') {
      return {
        enabled: true,
        scenario: (params.get('mock_scenario') as MockConfig['scenario']) || 'short',
        error: params.get('mock_error') as MockConfig['error'],
        errorAfterChunks: params.get('mock_error_after')
          ? parseInt(params.get('mock_error_after')!)
          : undefined,
        chunkSize: params.get('mock_chunk_size')
          ? parseInt(params.get('mock_chunk_size')!)
          : undefined,
        delayMs: params.get('mock_delay_ms') ? parseInt(params.get('mock_delay_ms')!) : undefined,
      }
    }
  }

  return { enabled: false }
}

// Set mock configuration in localStorage
export function setMockConfig(config: MockConfig) {
  if (typeof window !== 'undefined') {
    safeLocalStorage.setItem('mockStreamingConfig', JSON.stringify(config))
  }
}

// Clear mock configuration
export function clearMockConfig() {
  if (typeof window !== 'undefined') {
    safeLocalStorage.removeItem('mockStreamingConfig')
  }
}

// Get the appropriate fetch function based on mock config
export function getStreamingFetch(): typeof fetch {
  const config = getMockConfig()

  if (config.enabled) {
    // Wrap to handle proper URL construction
    return (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()

      // If it's the streaming endpoint, use mock
      if (url.includes('/api/generate-ai-gateway')) {
        // Replace with mock endpoint
        const mockUrl = url.replace('/api/generate-ai-gateway', '/api/generate-ai-gateway/mock')
        const urlObj = new URL(mockUrl, window.location.origin)

        // Add mock parameters to URL
        if (config.scenario) urlObj.searchParams.set('scenario', config.scenario)
        if (config.error) urlObj.searchParams.set('error', config.error)
        if (config.errorAfterChunks)
          urlObj.searchParams.set('error_after', config.errorAfterChunks.toString())
        if (config.chunkSize) urlObj.searchParams.set('chunk_size', config.chunkSize.toString())
        if (config.delayMs) urlObj.searchParams.set('delay_ms', config.delayMs.toString())
        urlObj.searchParams.set('skip_db', 'false') // We want DB integration by default

        return fetch(urlObj.toString(), init)
      }

      // For non-streaming endpoints, use regular fetch
      return fetch(input, init)
    }
  }

  return fetch
}

// Helper to enable mock in console
export function enableMockStreaming(
  scenario?: MockConfig['scenario'],
  error?: MockConfig['error']
) {
  setMockConfig({
    enabled: true,
    scenario: scenario || 'short',
    error,
  })
  console.log('✅ Mock streaming enabled. Reload the page to apply.')
  console.log('Current config:', getMockConfig())
}

// Helper to disable mock in console
export function disableMockStreaming() {
  clearMockConfig()
  console.log('❌ Mock streaming disabled. Reload the page to apply.')
}

// Export to window for easy console access in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  ;(window as { __mockStreaming?: unknown }).__mockStreaming = {
    enable: enableMockStreaming,
    disable: disableMockStreaming,
    config: getMockConfig,
    setConfig: setMockConfig,
    scenarios: ['short', 'long', 'error_midstream', 'slow_stream', 'instant', 'unicode_stress'],
    errors: ['network_timeout', 'rate_limit', 'auth_failed', 'server_error', 'invalid_prompt'],
  }

  console.log('🔧 Mock streaming available. Use __mockStreaming.enable() to start.')
}
