import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../auth/[...nextauth]/route'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const usage = await prisma.usage.findUnique({
    where: {
      userId_date: {
        userId: session.user.id,
        date: today,
      },
    },
  })

  // If no usage record exists for today, count is 0
  const count = usage?.count ?? 0
  const limit = 50

  return NextResponse.json({ count, limit })
}
