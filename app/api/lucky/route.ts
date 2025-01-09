import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { logInteraction } from '@/lib/interaction-logger'
import { LUCKY_INSTRUCTION } from './prompt'

// Explicitly declare Node.js runtime since we use file system operations
export const runtime = 'nodejs'

const DAILY_LIMIT = 24
const CLI_API_KEY = process.env.CLI_API_KEY

export async function GET(req: Request) {
  const requestId = Math.random().toString(36).slice(2, 7)
  try {
    const interactionTimestamp = req.headers.get('Interaction-Timestamp') || 'unknown'
    logInteraction(interactionTimestamp, 'serverRoute', 'Started /api/lucky route', { requestId })

    // Check for CLI API key first
    const apiKey = req.headers.get('X-CLI-API-Key')?.toLowerCase()
    const expectedApiKey = CLI_API_KEY?.toLowerCase()
    let userId: string | undefined

    console.log('[API Route] Auth details:', {
      requestId,
      apiKey,
      expectedApiKey,
      headers: Object.fromEntries(req.headers.entries()),
    })

    if (apiKey && expectedApiKey && apiKey === expectedApiKey) {
      // Skip auth for CLI tools with valid API key
      logInteraction(interactionTimestamp, 'serverRoute', 'CLI API key auth successful', { requestId })
      userId = 'cli-user' // Use a special ID for CLI requests
    } else {
      console.log('[API Route] API key mismatch:', {
        requestId,
        receivedKey: apiKey,
        expectedKey: CLI_API_KEY,
      })
      // Fall back to session auth for web requests
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 })
      }
      userId = session.user.id
    }

    logInteraction(interactionTimestamp, 'serverRoute', 'Checking user usage', {
      userId,
      requestId,
      source: 'lucky',
    })

    // Get or create usage record for today
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        usage: {
          where: {
            date: now,
          },
        },
      },
    })

    if (!dbUser) {
      // Create a new user if it doesn't exist (for CLI usage)
      await prisma.user.create({
        data: {
          id: userId,
          username: userId === 'cli-user' ? 'CLI Tool' : 'Unknown',
          usage: {
            create: {
              date: now,
              count: 0,
            },
          },
        },
      })
    }

    let usage = await prisma.usage.findUnique({
      where: {
        userId_date: {
          userId: userId,
          date: now,
        },
      },
    })

    if (!usage) {
      logInteraction(interactionTimestamp, 'serverRoute', 'Creating new usage record', {
        userId,
        requestId,
        source: 'lucky',
      })
      usage = await prisma.usage.create({
        data: {
          userId: userId,
          date: now,
          count: 0,
        },
      })
    }

    logInteraction(interactionTimestamp, 'serverRoute', 'Current usage status', {
      userId,
      currentCount: usage.count,
      limit: DAILY_LIMIT,
      requestId,
      source: 'lucky',
    })

    if (usage.count >= DAILY_LIMIT) {
      logInteraction(interactionTimestamp, 'serverRoute', 'Daily limit reached', {
        userId,
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
