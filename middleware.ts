import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

// Simple in-memory store for rate limiting
// In production, use Redis or a similar distributed store
const rateLimit = new Map<string, { count: number; resetTime: number }>()

// Rate limit settings
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5 // 5 requests per minute

export async function middleware(request: NextRequest) {
  // Only apply rate limiting to the generate endpoint
  if (!request.nextUrl.pathname.startsWith("/api/generate")) {
    return NextResponse.next()
  }

  try {
    // Get the token from the request
    const token = await getToken({ req: request as any })
    if (!token?.sub) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const userId = token.sub
    const now = Date.now()

    // Get or create rate limit entry for this user
    let rateLimitInfo = rateLimit.get(userId)
    if (!rateLimitInfo || now > rateLimitInfo.resetTime) {
      rateLimitInfo = {
        count: 0,
        resetTime: now + RATE_LIMIT_WINDOW
      }
    }

    // Check if user has exceeded rate limit
    if (rateLimitInfo.count >= MAX_REQUESTS_PER_WINDOW) {
      return new NextResponse(
        JSON.stringify({
          error: "Rate limit exceeded",
          details: "Please wait before making more requests"
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": String(MAX_REQUESTS_PER_WINDOW),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(rateLimitInfo.resetTime / 1000))
          }
        }
      )
    }

    // Increment the request count
    rateLimitInfo.count++
    rateLimit.set(userId, rateLimitInfo)

    // Add rate limit headers to the response
    const response = NextResponse.next()
    response.headers.set("X-RateLimit-Limit", String(MAX_REQUESTS_PER_WINDOW))
    response.headers.set(
      "X-RateLimit-Remaining",
      String(MAX_REQUESTS_PER_WINDOW - rateLimitInfo.count)
    )
    response.headers.set(
      "X-RateLimit-Reset",
      String(Math.ceil(rateLimitInfo.resetTime / 1000))
    )

    return response
  } catch (error) {
    console.error("Rate limiting error:", error)
    return new NextResponse(
      JSON.stringify({
        error: "Internal server error",
        details: "Failed to process rate limit"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}

export const config = {
  matcher: "/api/:path*"
} 