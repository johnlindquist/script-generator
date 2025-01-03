import { NextRequest, NextResponse } from 'next/server'
import { wrapApiHandler } from '@/lib/timing'
import { logInteraction } from '@/lib/interaction-logger'

export const runtime = 'nodejs'

const mockGenerateDraftScript = async (req: NextRequest) => {
  const requestId = Math.random().toString(36).substring(7)
  const interactionTimestamp =
    req.headers.get('Interaction-Timestamp') ||
    new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')

  logInteraction(interactionTimestamp, 'serverRoute', 'Started /api/mock-generate-draft route', {
    requestId,
  })

  try {
    const body = await req.json().catch(() => ({}))
    const { prompt } = body
    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
    }

    const mockScriptId = 'mock-draft-' + Math.random().toString(36).substring(7)

    const dummyChunks = [
      'Lorem ipsum dolor sit amet, ',
      'consectetur adipiscing elit, ',
      'sed do eiusmod tempor incididunt.',
    ]

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`__SCRIPT_ID__${mockScriptId}__SCRIPT_ID__`))
        dummyChunks.forEach(chunk => {
          controller.enqueue(new TextEncoder().encode(chunk))
        })
        controller.close()
      },
    })

    return new NextResponse(stream)
  } catch (error) {
    logInteraction(interactionTimestamp, 'serverRoute', 'Error in /api/mock-generate-draft route', {
      error: error instanceof Error ? error.message : String(error),
      requestId,
    })
    return NextResponse.json({ error: 'Mock generation failed' }, { status: 500 })
  }
}

export const POST = wrapApiHandler('mock_generate_draft_script', mockGenerateDraftScript)
