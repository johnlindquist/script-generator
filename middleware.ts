import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { debugLog } from '@/lib/debug-edge'

// Simple in-memory store for rate limiting
// In production, use Redis or a similar distributed store
const rateLimit = new Map<string, { count: number; resetTime: number }>()

// Rate limit settings
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 12 // 12 requests per minute

export async function middleware(request: NextRequest) {
  // Skip authentication for the prompt-text route
  if (
    request.nextUrl.pathname.includes('/prompt-template') ||
    request.nextUrl.pathname.includes('/api/generate-openrouter/prompt-text') ||
    request.nextUrl.pathname === '/api/usage'
  ) {
    return NextResponse.next()
  }

  // Skip middleware authentication for AI Gateway route (it handles auth internally)
  if (
    request.nextUrl.pathname === '/api/generate-ai-gateway' ||
    request.nextUrl.pathname === '/api/next-suggestions'
  ) {
    return NextResponse.next()
  }

  // Only apply rate limiting to the generate endpoint
  if (!request.nextUrl.pathname.startsWith('/api/generate')) {
    return NextResponse.next()
  }

  debugLog('middleware', 'Request details', {
    path: request.nextUrl.pathname,
    headers: Object.fromEntries(request.headers.entries()),
    source: request.headers.get('origin') ? 'web' : 'cli',
  })

  // Check for CLI API key first - only for non-web requests
  if (!request.headers.get('origin')) {
    const apiKey = request.headers.get('X-CLI-API-Key')?.toLowerCase()
    const expectedApiKey = process.env.CLI_API_KEY?.toLowerCase()

    if (apiKey && expectedApiKey && apiKey === expectedApiKey) {
      debugLog('middleware', 'CLI API key auth successful')
      return NextResponse.next()
    }
  }

  debugLog('middleware', 'Rate limit check started', {
    path: request.nextUrl.pathname,
  })

  try {
    // Get the token from the request
    const token = await getToken({ req: request as NextRequest })
    if (!token?.sub) {
      debugLog('middleware', 'Unauthorized request - no valid token')
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const userId = token.sub
    const now = Date.now()

    // Get or create rate limit entry for this user
    let rateLimitInfo = rateLimit.get(userId)
    if (!rateLimitInfo || now > rateLimitInfo.resetTime) {
      debugLog('middleware', 'Creating new rate limit entry', { userId })
      rateLimitInfo = {
        count: 0,
        resetTime: now + RATE_LIMIT_WINDOW,
      }
    }

    // Check if user has exceeded rate limit
    if (rateLimitInfo.count >= MAX_REQUESTS_PER_WINDOW) {
      debugLog('middleware', 'Rate limit exceeded', {
        userId,
        count: rateLimitInfo.count,
        resetTime: rateLimitInfo.resetTime,
      })
      return new NextResponse(
        JSON.stringify({
          error: 'Rate limit exceeded',
          details: 'Please wait before making more requests',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(MAX_REQUESTS_PER_WINDOW),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rateLimitInfo.resetTime / 1000)),
          },
        }
      )
    }

    // Increment the request count
    rateLimitInfo.count++
    rateLimit.set(userId, rateLimitInfo)

    debugLog('middleware', 'Rate limit updated', {
      userId,
      count: rateLimitInfo.count,
      remaining: MAX_REQUESTS_PER_WINDOW - rateLimitInfo.count,
    })

    // Add rate limit headers to the response
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', String(MAX_REQUESTS_PER_WINDOW))
    response.headers.set(
      'X-RateLimit-Remaining',
      String(MAX_REQUESTS_PER_WINDOW - rateLimitInfo.count)
    )
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimitInfo.resetTime / 1000)))

    return response
  } catch (error) {
    debugLog('middleware', 'Rate limiting error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return new NextResponse(
      JSON.stringify({
        error: 'Internal server error',
        details: 'Failed to process rate limit',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const config = {
  matcher: '/api/:path*',
}
