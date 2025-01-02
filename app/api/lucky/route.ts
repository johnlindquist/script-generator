import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

const LUCKY_INSTRUCTION =
  'Use these scripts above for inspiration. Create a new script inspiration by pieces of these scripts, but let it have a single focus and be useful. Avoid a generatic "power tools" scenario where it just combines them all'

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

    const usage = await prisma.usage.findUnique({
      where: {
        userId_date: {
          userId: session.user.id,
          date: now,
        },
      },
    })

    if (!usage) {
      return NextResponse.json({ error: 'Failed to track usage' }, { status: 500 })
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
      // First get total count
      const total = await tx.script.count({
        where: {
          status: 'ACTIVE',
          saved: true,
        },
      })

      if (total === 0) {
        throw new Error('No scripts found')
      }

      // Get random offset
      const skip = Math.floor(Math.random() * (total - 5))

      const randomScripts = await tx.script.findMany({
        where: {
          status: 'ACTIVE',
          saved: true,
        },
        select: {
          id: true,
          title: true,
          content: true,
        },
        take: 5,
        skip: Math.max(0, skip), // Ensure we don't go negative
      })

      const limitedScripts = randomScripts.map(s => ({
        id: s.id,
        title: s.title || 'Untitled Script',
        content: (s.content || '').slice(0, 300),
      }))

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
