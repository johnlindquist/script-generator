import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { logInteraction } from '@/lib/interaction-logger'
import { LUCKY_INSTRUCTION } from './prompt'

// Explicitly declare Node.js runtime since we use file system operations
export const runtime = 'nodejs'

const DAILY_LIMIT = 24

export async function GET(req: Request) {
  const requestId = Math.random().toString(36).substring(7)
  try {
    const interactionTimestamp = req.headers.get('Interaction-Timestamp') || 'unknown'
    logInteraction(interactionTimestamp, 'serverRoute', 'Started /api/lucky route', { requestId })

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      logInteraction(interactionTimestamp, 'serverRoute', 'Unauthorized request', { requestId })
      return NextResponse.json({ error: 'Session expired. Please sign in again.' }, { status: 401 })
    }

    logInteraction(interactionTimestamp, 'serverRoute', 'Checking user usage', {
      userId: session.user.id,
      requestId,
      source: 'lucky',
    })

    // Get or create usage record for today
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!dbUser) {
      logInteraction(interactionTimestamp, 'serverRoute', 'User not found in database', {
        requestId,
      })
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let usage = await prisma.usage.findUnique({
      where: {
        userId_date: {
          userId: session.user.id,
          date: now,
        },
      },
    })

    if (!usage) {
      logInteraction(interactionTimestamp, 'serverRoute', 'Creating new usage record', {
        userId: session.user.id,
        requestId,
        source: 'lucky',
      })
      usage = await prisma.usage.create({
        data: {
          userId: session.user.id,
          date: now,
          count: 0,
        },
      })
    }

    logInteraction(interactionTimestamp, 'serverRoute', 'Current usage status', {
      userId: session.user.id,
      currentCount: usage.count,
      limit: DAILY_LIMIT,
      requestId,
      source: 'lucky',
    })

    if (usage.count >= DAILY_LIMIT) {
      logInteraction(interactionTimestamp, 'serverRoute', 'Daily limit reached', {
        userId: session.user.id,
        count: usage.count,
        requestId,
        source: 'lucky',
      })
      return NextResponse.json(
        {
          error: 'Daily generation limit reached',
          details: `You have used all ${DAILY_LIMIT} generations for today. Try again tomorrow!`,
        },
        { status: 429 }
      )
    }

    const { scripts, combinedPrompt } = await prisma.$transaction(async tx => {
      // Fetch 5 truly random scripts directly from the database
      const randomScripts = await tx.$queryRaw<
        { id: string; title: string | null; content: string | null }[]
      >`
        SELECT id, title, content
        FROM "Script"
        WHERE status = 'ACTIVE' AND saved = true
        ORDER BY RANDOM()
        LIMIT 5
      `

      logInteraction(interactionTimestamp, 'serverRoute', 'Selected random scripts', {
        scriptIds: randomScripts.map(s => s.id),
        requestId,
        source: 'lucky',
      })

      const limitedScripts = randomScripts.map(s => ({
        id: s.id,
        title: s.title || 'Untitled Script',
        content: s.content || '',
      }))

      // Combine scripts into a prompt
      const combinedPrompt = `Here are some example scripts for inspiration:

${limitedScripts
  .map(
    (script, index) => `Example ${index + 1}: ${script.title}
${script.content}

`
  )
  .join('\n')}

${LUCKY_INSTRUCTION}`

      return { scripts: limitedScripts, combinedPrompt }
    })

    logInteraction(interactionTimestamp, 'serverRoute', 'Generated lucky prompt', {
      scriptCount: scripts.length,
      requestId,
      source: 'lucky',
    })

    return NextResponse.json({ scripts, combinedPrompt, requestId })
  } catch (error) {
    const interactionTimestamp = req.headers.get('Interaction-Timestamp') || 'unknown'
    logInteraction(interactionTimestamp, 'serverRoute', 'Error in /api/lucky route', {
      error: error instanceof Error ? error.message : String(error),
      requestId,
      source: 'lucky',
    })
    return NextResponse.json(
      {
        error: 'Failed to generate lucky prompt',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
