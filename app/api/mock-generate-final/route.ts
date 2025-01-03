import { NextRequest, NextResponse } from 'next/server'
import { wrapApiHandler } from '@/lib/timing'
import { logInteraction } from '@/lib/interaction-logger'

export const runtime = 'nodejs'

const mockGenerateFinalScript = async (req: NextRequest) => {
  const requestId = Math.random().toString(36).substring(7)
  const interactionTimestamp =
    req.headers.get('Interaction-Timestamp') ||
    new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')

  logInteraction(interactionTimestamp, 'serverRoute', 'Started /api/mock-generate-final route', {
    requestId,
  })

  try {
    const body = await req.json().catch(() => ({}))
    const { scriptId } = body
    if (!scriptId) {
      return NextResponse.json({ error: 'Missing scriptId' }, { status: 400 })
    }

    const dummyChunks = [
      '// Here is your final version: ',
      'Ut enim ad minim veniam, ',
      'quis nostrud exercitation ullamco laboris.',
    ]

    let aborted = false

    const stream = new ReadableStream({
      start(controller) {
        dummyChunks.forEach(chunk => {
          if (aborted) return
          controller.enqueue(new TextEncoder().encode(chunk))
        })
        controller.close()
      },
      cancel() {
        aborted = true
      },
    })

    return new NextResponse(stream)
  } catch (error) {
    logInteraction(interactionTimestamp, 'serverRoute', 'Error in /api/mock-generate-final route', {
      error: error instanceof Error ? error.message : String(error),
      requestId,
    })
    return NextResponse.json({ error: 'Mock final generation failed' }, { status: 500 })
  }
}

export const POST = wrapApiHandler('mock_generate_final_script', mockGenerateFinalScript)
