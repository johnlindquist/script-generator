import { NextRequest, NextResponse } from 'next/server'
import { logInteraction } from '@/lib/interaction-logger'
import { MockGenerateDraftSchema } from '@/lib/schemas'

export async function POST(req: NextRequest) {
  const interactionTimestamp = req.headers.get('Interaction-Timestamp') || new Date().toISOString()

  try {
    // Parse and validate request body
    const rawBody = await req.json()
    const parseResult = MockGenerateDraftSchema.safeParse(rawBody)

    if (!parseResult.success) {
      await logInteraction(interactionTimestamp, 'serverRoute', 'Invalid mock generate draft request body', {
        errors: parseResult.error.errors,
      })
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.errors }, { status: 400 })
    }

    const { prompt } = parseResult.data

    await logInteraction(interactionTimestamp, 'serverRoute', 'Mock generate draft request', {
      promptLength: prompt.length,
    })

    // Mock response for testing
    const mockScript = `// Mock generated script for: ${prompt}
import '@johnlindquist/kit'

console.log("This is a mock script generated for the prompt: ${prompt}")

// Add your actual script logic here
export default async () => {
  await div({
    html: \`<h1>Mock Script</h1>
          <p>Generated for prompt: ${prompt}</p>\`,
  })
}`

    return new Response(mockScript, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  } catch (error) {
    await logInteraction(interactionTimestamp, 'serverRoute', 'Error in mock generate draft route', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
