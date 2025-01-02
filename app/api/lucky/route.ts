import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { logInteraction } from '@/lib/interaction-logger'

const LUCKY_INSTRUCTION =
  'Use these scripts above for inspiration. Create a new script inspiration by pieces of these scripts, but let it have a single focus and be useful. Avoid a generatic "power tools" scenario where it just combines them all'

// Explicitly declare Node.js runtime since we use file system operations
export const runtime = 'nodejs'

const DAILY_LIMIT = 24

export async function GET(req: Request) {
  try {
    const interactionId = req.headers.get('Interaction-ID')
    logInteraction(interactionId || 'unknown', 'serverRoute', 'Started /api/lucky route')

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      logInteraction(interactionId || 'unknown', 'serverRoute', 'Unauthorized request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logInteraction(interactionId || 'unknown', 'serverRoute', 'Checking user usage', {
      userId: session.user.id,
    })

    // Get or create usage record for today
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!dbUser) {
      logInteraction(interactionId || 'unknown', 'serverRoute', 'User not found in database')
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
      logInteraction(interactionId || 'unknown', 'serverRoute', 'Creating new usage record', {
        userId: session.user.id,
      })
      usage = await prisma.usage.create({
        data: {
          userId: session.user.id,
          date: now,
          count: 0,
        },
      })
    }

    if (usage.count >= DAILY_LIMIT) {
      logInteraction(interactionId || 'unknown', 'serverRoute', 'Daily limit reached', {
        userId: session.user.id,
        count: usage.count,
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
      // First get all script IDs
      const scriptIds = await tx.script.findMany({
        where: {
          status: 'ACTIVE',
          saved: true,
        },
        select: {
          id: true,
        },
      })

      if (scriptIds.length === 0) {
        logInteraction(interactionId || 'unknown', 'serverRoute', 'No scripts found')
        throw new Error('No scripts found')
      }

      // Randomly select 5 unique IDs
      const selectedIds = new Set<string>()
      while (selectedIds.size < Math.min(5, scriptIds.length)) {
        const randomId = scriptIds[Math.floor(Math.random() * scriptIds.length)].id
        selectedIds.add(randomId)
      }

      // Fetch just those specific scripts
      const randomScripts = await tx.script.findMany({
        where: {
          id: {
            in: Array.from(selectedIds),
          },
        },
        select: {
          id: true,
          title: true,
          content: true,
        },
      })

      logInteraction(interactionId || 'unknown', 'serverRoute', 'Selected random scripts', {
        scriptIds: randomScripts.map(s => s.id),
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

    logInteraction(interactionId || 'unknown', 'serverRoute', 'Generated lucky prompt', {
      scriptCount: scripts.length,
    })

    return NextResponse.json({ scripts, combinedPrompt })
  } catch (error) {
    const interactionId = req.headers.get('Interaction-ID')
    logInteraction(interactionId || 'unknown', 'serverRoute', 'Error in /api/lucky route', {
      error: error instanceof Error ? error.message : String(error),
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
