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

export async function POST() {
  // TODO: Implement actual usage update logic if this POST is intentional
  // For now, let's assume it might be an attempt to update usage count
  // and mirror the GET logic for demonstration or return a specific message.
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // const body = await req.json(); // If you expect a body
  // console.log("POST /api/usage called with body:", body);

  // Placeholder: Re-fetch and return current usage, similar to GET
  // Or, if this endpoint is for INCREMENTING usage, that logic would go here.
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

  // Example: If POST is meant to increment usage
  // const newCount = (usage?.count ?? 0) + 1;
  // await prisma.usage.upsert({
  //   where: {
  //     userId_date: {
  //       userId: session.user.id,
  //       date: now,
  //     },
  //   },
  //   update: { count: newCount },
  //   create: { userId: session.user.id, date: now, count: 1 },
  // });

  return NextResponse.json({
    message: 'POST request received. Usage data below.',
    count: usage?.count ?? 0,
    limit: userLimit,
  })
}
