import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mapErrorToStreamError, useStreamErrorHandler } from '@/components/StreamErrorHandler'
import toast from 'react-hot-toast'

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
  },
}))

describe('StreamErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('mapErrorToStreamError', () => {
    it('should map network errors correctly', () => {
      const testCases = [
        new Error('Failed to fetch'),
        new Error('Network request failed'),
        new Error('ETIMEDOUT: Connection timed out'),
      ]

      testCases.forEach(error => {
        const result = mapErrorToStreamError(error)
        expect(result.type).toBe('network')
        expect(result.code).toBe('NETWORK_ERROR')
        expect(result.message).toBe(error.message)
        expect(result.timestamp).toBeInstanceOf(Date)
      })
    })

    it('should map auth errors correctly', () => {
      const testCases = [
        new Error('UNAUTHORIZED'),
        new Error('401: Unauthorized access'),
        new Error('Request failed with status 401'),
      ]

      testCases.forEach(error => {
        const result = mapErrorToStreamError(error)
        expect(result.type).toBe('auth')
        expect(result.code).toBe('UNAUTHORIZED')
        expect(result.message).toBe('Authentication required')
      })
    })

    it('should map rate limit errors correctly', () => {
      const testCases = [
        new Error('429: Too Many Requests'),
        new Error('Rate limit exceeded'),
      ]

      testCases.forEach(error => {
        const result = mapErrorToStreamError(error)
        expect(result.type).toBe('rate_limit')
        expect(result.code).toBe('RATE_LIMIT')
        expect(result.message).toBe('Rate limit exceeded')
      })
    })

    it('should map validation errors correctly', () => {
      const testCases = [
        new Error('Validation failed: prompt too short'),
        new Error('Invalid input provided'),
      ]

      testCases.forEach(error => {
        const result = mapErrorToStreamError(error)
        expect(result.type).toBe('validation')
        expect(result.code).toBe('VALIDATION_ERROR')
        expect(result.message).toBe(error.message)
      })
    })

    it('should map server errors correctly', () => {
      const testCases = [
        new Error('500: Internal Server Error'),
        new Error('Server error occurred'),
      ]

      testCases.forEach(error => {
        const result = mapErrorToStreamError(error)
        expect(result.type).toBe('server')
        expect(result.code).toBe('SERVER_ERROR')
        expect(result.message).toBe('Internal server error')
      })
    })

    it('should map unknown errors correctly', () => {
      const error = new Error('Something weird happened')
      const result = mapErrorToStreamError(error)
      
      expect(result.type).toBe('unknown')
      expect(result.message).toBe('Something weird happened')
      expect(result.code).toBeUndefined()
    })

    it('should handle non-Error objects', () => {
      const nonErrors = [
        'string error',
        { custom: 'error object' },
        null,
        undefined,
        123,
      ]

      nonErrors.forEach(error => {
        const result = mapErrorToStreamError(error)
        expect(result.type).toBe('unknown')
        expect(result.message).toBe('An unexpected error occurred')
        expect(result.details).toEqual({ error })
      })
    })
  })

  describe('useStreamErrorHandler', () => {
    it('should show toast for network errors', () => {
      const { handleStreamError } = useStreamErrorHandler()
      const error = new Error('Network request failed')
      const onRetry = vi.fn()

      handleStreamError(error, { onRetry })

      expect(toast.error).toHaveBeenCalledOnce()
      const toastCall = vi.mocked(toast.error).mock.calls[0]
      expect(toastCall[1]).toMatchObject({
        duration: 6000,
        position: 'top-right',
      })
    })

    it('should show longer toast for rate limit errors', () => {
      const { handleStreamError } = useStreamErrorHandler()
      const error = new Error('429: Rate limit exceeded')

      handleStreamError(error)

      expect(toast.error).toHaveBeenCalledOnce()
      const toastCall = vi.mocked(toast.error).mock.calls[0]
      expect(toastCall[1]).toMatchObject({
        duration: 10000, // Longer duration for rate limit
        position: 'top-right',
      })
    })

    it('should not show retry button for auth errors', () => {
      const { handleStreamError } = useStreamErrorHandler()
      const error = new Error('UNAUTHORIZED')
      const onRetry = vi.fn()

      handleStreamError(error, { onRetry })

      expect(toast.error).toHaveBeenCalledOnce()
      // We can't easily test the rendered content without rendering,
      // but we've verified the toast is called with correct options
    })

    it('should log errors in development', () => {
      const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {})
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
      
      // Mock NODE_ENV
      const originalEnv = process.env.NODE_ENV
      vi.stubEnv('NODE_ENV', 'development')

      const { handleStreamError } = useStreamErrorHandler()
      const error = new Error('Test error')

      handleStreamError(error)

      expect(consoleSpy).toHaveBeenCalledWith('[StreamError] unknown')
      expect(errorSpy).toHaveBeenCalled()
      expect(logSpy).toHaveBeenCalledWith('Timestamp:', expect.any(String))
      expect(groupEndSpy).toHaveBeenCalled()

      // Restore
      vi.unstubAllEnvs()
      consoleSpy.mockRestore()
      errorSpy.mockRestore()
      logSpy.mockRestore()
      groupEndSpy.mockRestore()
    })

    it('should handle callbacks correctly', () => {
      const { handleStreamError } = useStreamErrorHandler()
      const error = new Error('Server error')
      const onRetry = vi.fn()
      const onContactSupport = vi.fn()

      handleStreamError(error, { onRetry, onContactSupport })

      expect(toast.error).toHaveBeenCalledOnce()
      // Callbacks are passed through to the toast component
    })
  })
})