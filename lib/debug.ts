import fs from 'fs'
import path from 'path'

const DEBUG_DIR = path.join(process.cwd(), 'tmp', 'debug')

export function writeDebugFile(prefix: string, content: string) {
  // Only write debug files in development
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  try {
    // Create debug directory if it doesn't exist
    if (!fs.existsSync(DEBUG_DIR)) {
      fs.mkdirSync(DEBUG_DIR, { recursive: true })
    }

    // Create timestamp with microsecond precision
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    // Remove the 'Z' and add microseconds if not present
    const preciseTimestamp = timestamp.endsWith('Z') ? timestamp.slice(0, -1) + '-000Z' : timestamp

    // Combine timestamp with the rest of the prefix
    const filename = `${preciseTimestamp}__${prefix}.txt`
    const filepath = path.join(DEBUG_DIR, filename)

    // Write content
    fs.writeFileSync(filepath, content, 'utf-8')
    debugLog(`Debug file written: ${filepath}`)
  } catch (error) {
    console.error('Failed to write debug file:', error)
  }
}

// Helper to check if we're in development mode
export const isDev = process.env.NODE_ENV === 'development'

// Console logging wrapper that only logs in development
export function debugLog(...args: unknown[]) {
  if (isDev) {
    console.log(...args)
  }
}
