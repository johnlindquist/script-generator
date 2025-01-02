/**
 * Edge-compatible debug logging
 * Only uses Web APIs supported in Edge Runtime
 */

interface DebugLogData {
  timestamp: string
  context: string
  message: string
  data?: Record<string, unknown>
}

export function debugLog(context: string, message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString()
  const logData: DebugLogData = {
    timestamp,
    context,
    message,
    ...(data && { data }),
  }

  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.log(JSON.stringify(logData))
  }
}
