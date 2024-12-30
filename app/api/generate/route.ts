import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { authOptions } from '../auth/[...nextauth]/route'
import { SECOND_PASS_PROMPT, cleanCodeFences } from '@/lib/generation'

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

    const { scriptId } = await req.json()
    if (!scriptId) {
      return NextResponse.json({ error: 'Script ID is required' }, { status: 400 })
    }

    // Get the initial script from the database
    const initialScript = await prisma.script.findUnique({
      where: { id: scriptId },
    })

    if (!initialScript) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    if (initialScript.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Generate refined script using Gemini
    const result = await model.generateContentStream(
      SECOND_PASS_PROMPT.replace('{script}', initialScript.content).replace(
        '{userInfo}',
        JSON.stringify({
          name: session.user.name,
          image: session.user.image,
        })
      )
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

          // Update the script in the database
          await prisma.script.update({
            where: { id: scriptId },
            data: {
              content: fullScript,
              status: 'ACTIVE', // Mark as active now that it's complete
            },
          })

          // Save the original version
          await prisma.scriptVersion.create({
            data: {
              scriptId,
              content: initialScript.content,
            },
          })

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
        'X-Script-Id': scriptId,
      },
    })
  } catch (error) {
    console.error('Generate error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate script',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
