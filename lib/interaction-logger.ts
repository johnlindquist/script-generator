import fs from 'fs'
import path from 'path'
import { assertRuntime } from './runtime'

const isDev = process.env.NODE_ENV === 'development'
const LOG_DIR = path.join(process.cwd(), 'logs', 'interactions')

interface InteractionLogData {
  timestamp: string
  stage: 'client' | 'stateMachine' | 'serverRoute'
  message: string
  data?: Record<string, unknown>
}

/**
 * Ensure we have a logs directory for interactions.
 */
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }
}

/**
 * Writes a single line in a log file for an interaction.
 * @param interactionTimestamp - The timestamp when the interaction started (from the click)
 */
export function logInteraction(
  interactionTimestamp: string,
  stage: InteractionLogData['stage'],
  message: string,
  data?: Record<string, unknown>
) {
  if (!isDev) return // Only log in development

  assertRuntime('node') // ensure we're in node

  ensureLogDir()

  const filename = `${interactionTimestamp}__interaction.log`
  const filePath = path.join(LOG_DIR, filename)
  const timestamp = new Date().toISOString()
  const logEntry: InteractionLogData = {
    timestamp,
    stage,
    message,
    ...(data && { data }),
  }

  fs.appendFileSync(filePath, JSON.stringify(logEntry) + '\n', 'utf-8')
}

/**
 * Clean up old interaction logs (older than 24 hours)
 */
export function cleanupOldLogs() {
  if (!isDev) return

  assertRuntime('node')

  if (!fs.existsSync(LOG_DIR)) return

  const files = fs.readdirSync(LOG_DIR)
  const now = Date.now()
  const oneDayAgo = now - 24 * 60 * 60 * 1000

  files.forEach(file => {
    const filePath = path.join(LOG_DIR, file)
    const stats = fs.statSync(filePath)
    if (stats.mtimeMs < oneDayAgo) {
      fs.unlinkSync(filePath)
    }
  })
}
