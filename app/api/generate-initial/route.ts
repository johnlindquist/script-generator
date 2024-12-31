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

const DAILY_LIMIT = 25

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

    // Check and increment usage count
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    let usage = await prisma.usage.findUnique({
      where: {
        userId_date: {
          userId: session.user.id,
          date: now,
        },
      },
    })

    if (!usage) {
      usage = await prisma.usage.create({
        data: {
          userId: session.user.id,
          date: now,
          count: 0,
        },
      })
    }

    if (usage.count >= DAILY_LIMIT) {
      return NextResponse.json(
        {
          error: 'Daily generation limit reached',
          details: `You have used all ${DAILY_LIMIT} generations for today. Try again tomorrow!`,
        },
        { status: 429 }
      )
    }

    // Increment usage count
    await prisma.usage.update({
      where: {
        userId_date: {
          userId: session.user.id,
          date: now,
        },
      },
      data: {
        count: { increment: 1 },
      },
    })

    // Generate initial script using Gemini
    const result = await model.generateContentStream(
      INITIAL_PASS_PROMPT.replace('{prompt}', prompt).replace(
        '{userInfo}',
        JSON.stringify({
          name: session.user.name,
          image: session.user.image,
        })
      )
    )

    let fullScript = ''
    let aborted = false

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            if (aborted) break
            const text = cleanCodeFences(chunk.text())
            fullScript += text
            controller.enqueue(new TextEncoder().encode(text))
          }

          if (!aborted) {
            try {
              // Check for existing script with this requestId
              const existingScript = await prisma.script.findUnique({
                where: { requestId },
              })

              let script
              if (existingScript) {
                // Update existing script
                script = await prisma.script.update({
                  where: { requestId },
                  data: {
                    content: fullScript,
                    title: prompt.slice(0, 100),
                    summary: prompt,
                    ownerId: session.user.id,
                    saved: false,
                    status: 'IN_PROGRESS',
                  },
                })
              } else {
                // Create new script
                script = await prisma.script.create({
                  data: {
                    content: fullScript,
                    title: prompt.slice(0, 100),
                    summary: prompt,
                    requestId,
                    ownerId: session.user.id,
                    saved: false,
                    status: 'IN_PROGRESS',
                  },
                })
              }

              // Add a special delimiter to indicate the script ID
              controller.enqueue(
                new TextEncoder().encode(`\n__SCRIPT_ID__${script.id}__SCRIPT_ID__\n`)
              )
              controller.enqueue(new TextEncoder().encode(''))
              controller.close()
            } catch (dbError) {
              const errorMessage =
                dbError instanceof Error ? dbError.message : 'Database error occurred'
              controller.error(new Error(errorMessage))
            }
          } else {
            controller.close()
          }
        } catch (streamError) {
          const errorMessage =
            streamError instanceof Error ? streamError.message : 'Stream error occurred'
          controller.error(new Error(errorMessage))
        }
      },
      cancel() {
        aborted = true
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
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
