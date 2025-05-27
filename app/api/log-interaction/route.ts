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

  // Allow all origins in development if NEXT_PUBLIC_APP_URL is not set, or if it matches
  // This is a simplified check for development; refine for production if needed
  const isAllowedOrigin = process.env.NODE_ENV === 'development' || allowedOrigins.includes(origin)

  if (!isAllowedOrigin && origin !== '') {
    console.warn(`log-interaction: Forbidden origin: ${origin}`)
    return new NextResponse(null, {
      status: 403,
      statusText: 'Forbidden',
    })
  }

  try {
    const { interactionTimestamp, logEntry } = await request.json()
    // Console log to verify received data
    console.log(
      `[log-interaction API] Received log for ${interactionTimestamp}: "${logEntry?.message}"`
    )

    ensureLogDir()

    const filename = `${interactionTimestamp}__interaction.log`
    const filePath = path.join(LOG_DIR, filename)

    fs.appendFileSync(filePath, JSON.stringify(logEntry) + '\n', 'utf-8')

    const response = NextResponse.json({ success: true })

    // Set CORS headers
    if (origin) {
      // Only set if origin is present
      response.headers.set('Access-Control-Allow-Origin', origin)
    }
    response.headers.set('Access-Control-Allow-Methods', 'POST')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

    return response
  } catch (error) {
    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    console.error('[log-interaction API] Error logging interaction:', error)
    // Return a 500 error status
    const errorResponse = NextResponse.json(
      { success: false, error: 'Failed to log interaction', details: errorMessage },
      { status: 500 }
    )
    if (origin) {
      // Also set CORS for error responses
      errorResponse.headers.set('Access-Control-Allow-Origin', origin)
    }
    errorResponse.headers.set('Access-Control-Allow-Methods', 'POST')
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    return errorResponse
  }
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  const headersList = await headers()
  const origin = headersList.get('origin') || ''
  const allowedOrigins = ['http://localhost:3000', process.env.VERCEL_URL].filter(Boolean)
  const isAllowedOrigin = process.env.NODE_ENV === 'development' || allowedOrigins.includes(origin)

  if (!isAllowedOrigin && origin !== '') {
    return new NextResponse(null, {
      status: 403,
      statusText: 'Forbidden',
    })
  }

  const response = new NextResponse(null, {
    status: 204,
  })

  if (origin) {
    // Only set if origin is present
    response.headers.set('Access-Control-Allow-Origin', origin)
  }
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS') // Add OPTIONS
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  response.headers.set('Access-Control-Max-Age', '86400')

  return response
}
