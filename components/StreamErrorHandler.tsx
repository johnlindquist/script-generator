'use client'

import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { AlertTriangle, WifiOff, Clock, ShieldAlert, Code } from 'lucide-react'

export interface StreamError {
  type: 'network' | 'auth' | 'rate_limit' | 'validation' | 'server' | 'unknown'
  message: string
  code?: string
  timestamp: Date
  details?: Record<string, unknown>
}

interface StreamErrorHandlerProps {
  error: StreamError | null
  onRetry?: () => void
  onContactSupport?: () => void
}

const errorIcons = {
  network: WifiOff,
  auth: ShieldAlert,
  rate_limit: Clock,
  validation: AlertTriangle,
  server: AlertTriangle,
  unknown: Code,
}

const errorMessages = {
  network: {
    title: 'Connection Error',
    action: 'Check your internet connection and try again.',
  },
  auth: {
    title: 'Authentication Required',
    action: 'Please sign in to continue.',
  },
  rate_limit: {
    title: 'Rate Limit Exceeded',
    action: "You've made too many requests. Please wait a moment.",
  },
  validation: {
    title: 'Invalid Input',
    action: 'Please check your prompt and try again.',
  },
  server: {
    title: 'Server Error',
    action: 'Something went wrong on our end. Please try again.',
  },
  unknown: {
    title: 'Unexpected Error',
    action: 'An unexpected error occurred. Please try again.',
  },
}

export function mapErrorToStreamError(error: Error | unknown): StreamError {
  const timestamp = new Date()

  if (error instanceof Error) {
    // Network errors
    if (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('ETIMEDOUT')
    ) {
      return {
        type: 'network',
        message: error.message,
        code: 'NETWORK_ERROR',
        timestamp,
      }
    }

    // Auth errors
    if (error.message === 'UNAUTHORIZED' || error.message.includes('401')) {
      return {
        type: 'auth',
        message: 'Authentication required',
        code: 'UNAUTHORIZED',
        timestamp,
      }
    }

    // Rate limit
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      return {
        type: 'rate_limit',
        message: 'Rate limit exceeded',
        code: 'RATE_LIMIT',
        timestamp,
      }
    }

    // Validation
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return {
        type: 'validation',
        message: error.message,
        code: 'VALIDATION_ERROR',
        timestamp,
      }
    }

    // Server errors
    if (error.message.includes('500') || error.message.includes('server')) {
      return {
        type: 'server',
        message: 'Internal server error',
        code: 'SERVER_ERROR',
        timestamp,
      }
    }

    // Default to unknown with original message
    return {
      type: 'unknown',
      message: error.message,
      timestamp,
    }
  }

  // Non-Error objects
  return {
    type: 'unknown',
    message: 'An unexpected error occurred',
    timestamp,
    details: { error },
  }
}

export default function StreamErrorHandler({
  error,
  onRetry,
  onContactSupport,
}: StreamErrorHandlerProps) {
  useEffect(() => {
    if (!error) return

    const { type, message } = error
    const { title, action } = errorMessages[type]
    const Icon = errorIcons[type]

    // Show toast notification
    toast.error(
      () => (
        <div className="flex items-start gap-3">
          <Icon className="w-5 h-5 mt-0.5 text-red-500" />
          <div className="flex-1">
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{action}</p>
            {message && message !== title && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {message.substring(0, 100)}...
              </p>
            )}
            <div className="flex gap-2 mt-2">
              {onRetry && type !== 'auth' && (
                <button
                  onClick={() => {
                    onRetry()
                  }}
                  className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:opacity-90"
                >
                  Try Again
                </button>
              )}
              {type === 'auth' && (
                <button
                  onClick={() => {
                    window.location.href = '/api/auth/signin'
                  }}
                  className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:opacity-90"
                >
                  Sign In
                </button>
              )}
              {onContactSupport && type === 'server' && (
                <button
                  onClick={() => {
                    onContactSupport()
                  }}
                  className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Contact Support
                </button>
              )}
            </div>
          </div>
        </div>
      ),
      {
        duration: type === 'rate_limit' ? 10000 : 6000,
        position: 'top-right',
      }
    )

    // Log error details for debugging
    if (process.env.NODE_ENV === 'development') {
      console.group(`[StreamError] ${type}`)
      console.error('Error:', error)
      console.log('Timestamp:', error.timestamp.toISOString())
      if (error.details) {
        console.log('Details:', error.details)
      }
      console.groupEnd()
    }

    // Report to error tracking service in production
    if (process.env.NODE_ENV === 'production' && type === 'server') {
      // TODO: Integrate with error tracking service (e.g., Sentry)
      // window.Sentry?.captureException(error)
    }
  }, [error, onRetry, onContactSupport])

  return null
}

// Helper hook to use in components
export function useStreamErrorHandler() {
  const handleStreamError = (
    error: Error | unknown,
    callbacks?: {
      onRetry?: () => void
      onContactSupport?: () => void
    }
  ) => {
    const streamError = mapErrorToStreamError(error)

    // Show error using toast directly instead of rendering a component
    const { type, message } = streamError
    const { title, action } = errorMessages[type]
    const Icon = errorIcons[type]

    toast.error(
      () => (
        <div className="flex items-start gap-3">
          <Icon className="w-5 h-5 mt-0.5 text-red-500" />
          <div className="flex-1">
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{action}</p>
            {message && message !== title && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {message.substring(0, 100)}...
              </p>
            )}
            <div className="flex gap-2 mt-2">
              {callbacks?.onRetry && type !== 'auth' && (
                <button
                  onClick={() => {
                    callbacks.onRetry?.()
                  }}
                  className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:opacity-90"
                >
                  Try Again
                </button>
              )}
              {type === 'auth' && (
                <button
                  onClick={() => {
                    window.location.href = '/api/auth/signin'
                  }}
                  className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:opacity-90"
                >
                  Sign In
                </button>
              )}
              {callbacks?.onContactSupport && type === 'server' && (
                <button
                  onClick={() => {
                    callbacks.onContactSupport?.()
                  }}
                  className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Contact Support
                </button>
              )}
            </div>
          </div>
        </div>
      ),
      {
        duration: type === 'rate_limit' ? 10000 : 6000,
        position: 'top-right',
      }
    )

    // Log error details for debugging
    if (process.env.NODE_ENV === 'development') {
      console.group(`[StreamError] ${type}`)
      console.error('Error:', streamError)
      console.log('Timestamp:', streamError.timestamp.toISOString())
      if (streamError.details) {
        console.log('Details:', streamError.details)
      }
      console.groupEnd()
    }
  }

  return { handleStreamError }
}
