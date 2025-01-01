import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../auth/[...nextauth]/route'
import { model } from '@/lib/gemini'
import { SECOND_PASS_PROMPT, cleanCodeFences } from '@/lib/generation'
import { wrapApiHandler } from '@/lib/timing'

const DAILY_LIMIT = 24

const generateScript = async (req: NextRequest) => {
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

    // Check if user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!dbUser) {
      // Create user if they don't exist
      await prisma.user.create({
        data: {
          id: session.user.id,
          githubId: session.user.githubId,
          username:
            session.user.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ??
            session.user.email?.split('@')[0] ??
            'unknown-user',
        },
      })
    }

    const { scriptId } = await req.json()
    if (!scriptId) {
      return NextResponse.json({ error: 'Script ID is required' }, { status: 400 })
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
              await prisma.script.update({
                where: { id: scriptId },
                data: {
                  content: fullScript,
                  status: 'ACTIVE',
                },
              })

              await prisma.scriptVersion.create({
                data: {
                  scriptId,
                  content: initialScript.content,
                },
              })

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
        'X-Script-Id': scriptId,
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
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

export const POST = wrapApiHandler('generate_script', generateScript)
