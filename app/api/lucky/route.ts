import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { writeDebugFile, debugLog } from '@/lib/debug'

const LUCKY_INSTRUCTION =
  'Use these scripts above for inspiration. Create a new script inspiration by pieces of these scripts, but let it have a single focus and be useful. Avoid a generatic "power tools" scenario where it just combines them all'

// Explicitly declare Node.js runtime since we use file system operations
export const runtime = 'nodejs'

const DAILY_LIMIT = 24

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check usage limit first
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
      // Create initial usage record for new users
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

      debugLog('lucky', 'Selected random scripts', { scriptIds: randomScripts.map(s => s.id) })

      const limitedScripts = randomScripts.map(s => ({
        id: s.id,
        title: s.title || 'Untitled Script',
        content: s.content || '',
      }))

      // Write debug files for each selected script
      limitedScripts.forEach((script, index) => {
        writeDebugFile(
          `lucky_script_${index + 1}_id_${script.id}`,
          `Title: ${script.title}\nContent:\n${script.content}`
        )
      })

      const combinedPrompt =
        limitedScripts
          .map(s =>
            `
---            
Script "${s.title}":\n${s.content}
---            
            `.trim()
          )
          .join('\n\n') +
        '\n\n' +
        LUCKY_INSTRUCTION

      // Write the final combined prompt
      writeDebugFile('lucky_combined_prompt', combinedPrompt)
      debugLog('lucky', 'Combined prompt created', { length: combinedPrompt.length })

      return { scripts: limitedScripts, combinedPrompt }
    })

    // Increment usage count
    await prisma.usage.upsert({
      where: {
        userId_date: {
          userId: session.user.id,
          date: now,
        },
      },
      create: {
        userId: session.user.id,
        date: now,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
    })

    return NextResponse.json({ scripts, combinedPrompt })
  } catch (error) {
    const status = error instanceof Error && error.message === 'No scripts found' ? 404 : 500
    const message = error instanceof Error ? error.message : 'Failed to fetch random scripts'

    return NextResponse.json({ error: message }, { status })
  }
}
