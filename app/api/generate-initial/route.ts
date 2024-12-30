import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { authOptions } from '../auth/[...nextauth]/route'
import { INITIAL_PASS_PROMPT, cleanCodeFences } from '@/lib/generation'

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  generationConfig: {
    maxOutputTokens: 8192,
  },
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: 'Unauthorized - No valid user ID',
          details: 'Please try signing out and signing back in',
        },
        { status: 401 }
      )
    }

    const { prompt, requestId } = await req.json()
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    if (!requestId || requestId.trim().length === 0) {
      return NextResponse.json({ error: 'A valid requestId is required' }, { status: 400 })
    }

    // Generate initial script using Gemini
    const result = await model.generateContentStream(
      INITIAL_PASS_PROMPT.replace('{prompt}', prompt)
    )

    let fullScript = ''

    // Create a ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = cleanCodeFences(chunk.text())
            fullScript += text
            controller.enqueue(new TextEncoder().encode(text))
          }

          // Save the raw script to the database
          const script = await prisma.script.create({
            data: {
              content: fullScript,
              title: prompt.slice(0, 100),
              summary: prompt,
              requestId,
              ownerId: session.user.id,
              saved: false,
              status: 'IN_PROGRESS', // Mark as in progress until second pass
            },
          })

          // Add a special delimiter to indicate the script ID
          controller.enqueue(new TextEncoder().encode(`\n__SCRIPT_ID__${script.id}__SCRIPT_ID__\n`))

          controller.close()
        } catch (streamError) {
          console.error('Stream error:', streamError)
          controller.error(streamError)
        }
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Generate initial error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate initial script',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
