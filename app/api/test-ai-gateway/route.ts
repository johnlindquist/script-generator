import { NextRequest, NextResponse } from 'next/server'
import { logInteraction } from '@/lib/interaction-logger'
import { TestAIGatewaySchema } from '@/lib/schemas'

export async function POST(req: NextRequest) {
  const interactionTimestamp = req.headers.get('Interaction-Timestamp') || new Date().toISOString()

  try {
    // Parse and validate request body
    const rawBody = await req.json()
    const parseResult = TestAIGatewaySchema.safeParse(rawBody)

    if (!parseResult.success) {
      await logInteraction(interactionTimestamp, 'serverRoute', 'Invalid test AI gateway request body', {
        errors: parseResult.error.errors,
      })
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.errors }, { status: 400 })
    }

    const { prompt } = parseResult.data

    await logInteraction(interactionTimestamp, 'serverRoute', 'Test AI gateway request', {
      promptLength: prompt.length,
    })

    // Mock AI response for testing
    const mockResponse = `Test response for prompt: "${prompt}"\n\nThis is a test of the AI gateway functionality.`

    // Return as text stream to match expected format
    return new Response(mockResponse, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    await logInteraction(interactionTimestamp, 'serverRoute', 'Error in test AI gateway route', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
