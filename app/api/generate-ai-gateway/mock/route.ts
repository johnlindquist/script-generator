import { NextRequest } from 'next/server'
import { createMockStream, createMockResponse, createMockErrorResponse } from '@/lib/mock-streaming'
import { mockScripts, errorTypes } from '@/lib/mock-scripts'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// Allow access without authentication for testing
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Get mock parameters from query string
    const searchParams = request.nextUrl.searchParams
    const scenario = searchParams.get('scenario') || 'short'
    const errorType = searchParams.get('error') as keyof typeof errorTypes | null
    const errorAfter = parseInt(searchParams.get('error_after') || '5')
    const chunkSize = searchParams.get('chunk_size')
      ? parseInt(searchParams.get('chunk_size')!)
      : undefined
    const delayMs = searchParams.get('delay_ms')
      ? parseInt(searchParams.get('delay_ms')!)
      : undefined
    const skipDb = searchParams.get('skip_db') === 'true'

    // Parse request body
    const body = (await request.json()) as { prompt?: string }
    const { prompt } = body

    // Basic validation
    if (!prompt || prompt.length < 15) {
      return createMockErrorResponse('invalid_prompt')
    }

    // Check if scenario exists
    if (!mockScripts[scenario as keyof typeof mockScripts]) {
      return new Response(
        JSON.stringify({
          error: `Invalid scenario: ${scenario}`,
          available: Object.keys(mockScripts),
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Simulate authentication errors
    if (errorType === 'auth_failed') {
      return createMockErrorResponse('auth_failed')
    }

    // Simulate rate limiting
    if (errorType === 'rate_limit') {
      return createMockErrorResponse('rate_limit')
    }

    // Create script in database (unless skipped for pure testing)
    let scriptId = `mock-${Date.now()}`

    if (!skipDb) {
      try {
        // Create a mock user if needed (for testing without auth)
        const mockUser = await prisma.user.upsert({
          where: { username: 'mockuser' },
          update: {},
          create: {
            id: 'mock-user-id',
            username: 'mockuser',
            fullName: 'Mock User',
          },
        })

        // Create the script
        const createData: Prisma.ScriptCreateInput = {
          title: mockScripts[scenario as keyof typeof mockScripts].name,
          content: '',
          prompt,
          owner: {
            connect: { id: mockUser.id },
          },
        }

        const script = await prisma.script.create({
          data: createData,
        })

        scriptId = script.id
      } catch (dbError) {
        console.error('Mock endpoint DB error:', dbError)
        // Continue without DB
      }
    }

    // Create the mock stream
    const stream = createMockStream({
      scriptId,
      scenario: scenario as keyof typeof mockScripts,
      error: errorType || undefined,
      errorAfterChunks: errorAfter,
      chunkSize,
      delayMs,
      onChunk: (chunk, index) => {
        // Log streaming progress in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Mock Stream] Chunk ${index}: ${chunk.substring(0, 30)}...`)
        }
      },
      onError: error => {
        console.error('[Mock Stream] Error:', error.message)

        // Update script status on error
        if (!skipDb && scriptId !== `mock-${Date.now()}`) {
          prisma.script
            .update({
              where: { id: scriptId },
              data: {
                content:
                  mockScripts[scenario as keyof typeof mockScripts].content.substring(0, 500) +
                  '\n\n// ERROR: ' +
                  error.message,
              },
            })
            .catch(console.error)
        }
      },
    })

    // Return the streaming response
    return createMockResponse(stream)
  } catch (error) {
    console.error('Mock endpoint error:', error)
    return new Response(
      JSON.stringify({
        error: 'Mock endpoint error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

// GET endpoint for testing without needing to POST
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const scenario = searchParams.get('scenario') || 'short'

  // Return available scenarios and parameters
  return new Response(
    JSON.stringify({
      message: 'Mock streaming endpoint',
      usage: {
        method: 'POST',
        body: { prompt: 'Your prompt here (min 15 chars)' },
        queryParams: {
          scenario: Object.keys(mockScripts),
          error: Object.keys(errorTypes),
          error_after: 'Number of chunks before error',
          chunk_size: 'Characters per chunk',
          delay_ms: 'Delay between chunks in ms',
          skip_db: 'Skip database operations (true/false)',
        },
      },
      currentScenario: scenario,
      availableScenarios: Object.entries(mockScripts).map(([key, script]) => ({
        key,
        name: script.name,
        description: script.description,
        defaultChunkSize: script.chunkSize,
        defaultDelay: script.delayMs,
      })),
      availableErrors: Object.entries(errorTypes).map(([key, error]) => ({
        key,
        ...error,
      })),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
