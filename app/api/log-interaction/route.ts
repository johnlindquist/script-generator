import fs from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

const LOG_DIR = path.join(process.cwd(), 'logs', 'interactions')

/**
 * Ensure we have a logs directory for interactions.
 */
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }
}

/**
 * Clean up old interaction logs (older than 24 hours)
 */
function cleanupOldLogs() {
  if (process.env.NODE_ENV !== 'development') return

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

/**
 * API route to handle interaction logging
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Logging only available in development' }, { status: 404 })
  }

  // Handle CORS
  const headersList = await headers()
  const origin = headersList.get('origin') || ''
  const allowedOrigins = ['http://localhost:3000', process.env.VERCEL_URL].filter(Boolean)

  if (!allowedOrigins.includes(origin) && origin !== '') {
    return new NextResponse(null, {
      status: 403,
      statusText: 'Forbidden',
    })
  }

  try {
    const { interactionTimestamp, logEntry } = await request.json()

    ensureLogDir()
    cleanupOldLogs() // Clean up old logs on each request

    const filename = `${interactionTimestamp}__interaction.log`
    const filePath = path.join(LOG_DIR, filename)

    fs.appendFileSync(filePath, JSON.stringify(logEntry) + '\n', 'utf-8')

    const response = NextResponse.json({ success: true })

    // Set CORS headers
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'POST')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

    return response
  } catch (error) {
    console.error('Error logging interaction:', error)
    return NextResponse.json({ error: 'Failed to log interaction' }, { status: 500 })
  }
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  const headersList = await headers()
  const origin = headersList.get('origin') || ''
  const allowedOrigins = ['http://localhost:3000', process.env.VERCEL_URL].filter(Boolean)

  if (!allowedOrigins.includes(origin) && origin !== '') {
    return new NextResponse(null, {
      status: 403,
      statusText: 'Forbidden',
    })
  }

  const response = new NextResponse(null, {
    status: 204,
  })

  response.headers.set('Access-Control-Allow-Origin', origin)
  response.headers.set('Access-Control-Allow-Methods', 'POST')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  response.headers.set('Access-Control-Max-Age', '86400')

  return response
}
