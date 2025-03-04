/**
 * Logs an interaction by sending it to the server API endpoint
 */
export async function logInteraction(
  interactionTimestamp: string,
  stage: 'client' | 'stateMachine' | 'serverRoute',
  message: string,
  data?: Record<string, unknown>
) {
  // Create the log entry
  const logEntry = {
    timestamp: new Date().toISOString(),
    stage,
    message,
    ...(data && { data }),
  }

  // Always log to console in production for debugging
  if (process.env.NODE_ENV === 'production') {
    console.log(`[${stage}][${interactionTimestamp}] ${message}`, data || '')
    return
  }

  // In development, send to log API endpoint
  if (process.env.NODE_ENV === 'development') {
    try {
      const baseUrl = getBaseUrl()
      await fetch(`${baseUrl}/api/log-interaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interactionTimestamp,
          logEntry,
        }),
      })
    } catch (error) {
      console.warn('Failed to log interaction:', error)
    }
  }
}

/**
 * Get the base URL for API requests
 */
function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // Browser should use relative path
    return ''
  }

  if (process.env.VERCEL_URL) {
    // Reference for vercel.com
    return `https://${process.env.VERCEL_URL}`
  }

  // Assume localhost
  return 'http://localhost:3000'
}
