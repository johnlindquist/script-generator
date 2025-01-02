import fs from 'fs'
import path from 'path'
import { assertRuntime } from './runtime'

const isDev = process.env.NODE_ENV === 'development'
const DEBUG_DIR = path.join(process.cwd(), 'tmp', 'debug')

interface DebugLogData {
  timestamp: string
  context: string
  message: string
  data?: Record<string, unknown>
  runtime: 'node'
}

export function debugLog(context: string, message: string, data?: Record<string, unknown>) {
  if (!isDev) return

  // Always assert we're in Node.js Runtime for this module
  assertRuntime('node')

  const logData: DebugLogData = {
    timestamp: new Date().toISOString(),
    context,
    message,
    runtime: 'node',
    ...(data && { data }),
  }

  const prefix = `[${logData.timestamp}][${context}][node]`
  if (data) {
    console.log(prefix, message, data)
  } else {
    console.log(prefix, message)
  }

  return logData
}

interface DebugFileOperation {
  type: 'write'
  prefix: string
  filepath: string
  timestamp: string
  runtime: 'node'
}

export function writeDebugFile(prefix: string, content: string) {
  if (!isDev) return

  // Always assert we're in Node.js Runtime for this module
  assertRuntime('node')

  try {
    // Create debug directory if it doesn't exist
    if (!fs.existsSync(DEBUG_DIR)) {
      fs.mkdirSync(DEBUG_DIR, { recursive: true })
    }

    // Create timestamp with microsecond precision
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const preciseTimestamp = timestamp.endsWith('Z') ? timestamp.slice(0, -1) + '-000Z' : timestamp

    // Combine timestamp with the rest of the prefix
    const filename = `${preciseTimestamp}__${prefix}.txt`
    const filepath = path.join(DEBUG_DIR, filename)

    // Write content
    fs.writeFileSync(filepath, content, 'utf-8')

    const operation: DebugFileOperation = {
      type: 'write',
      prefix,
      filepath,
      timestamp: new Date().toISOString(),
      runtime: 'node',
    }

    debugLog('debug', 'Debug file written', { operation })
  } catch (error) {
    debugLog('debug', 'Failed to write debug file', {
      error: error instanceof Error ? error.message : String(error),
      prefix,
    })
  }
}
