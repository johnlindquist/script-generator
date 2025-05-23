import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../auth/[...nextauth]/route'

const DAILY_LIMIT = 24
const SPONSOR_DAILY_LIMIT = 100

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userLimit = session.user.isSponsor ? SPONSOR_DAILY_LIMIT : DAILY_LIMIT

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

  return NextResponse.json({
    count: usage?.count ?? 0,
    limit: userLimit,
  })
}
