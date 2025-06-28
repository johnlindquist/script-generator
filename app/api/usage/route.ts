// Next.js API route to check if user is a sponsor
import { init, track, Types } from '@amplitude/analytics-node'
import { NextRequest, NextResponse } from 'next/server'
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

init(process.env.AMPLITUDE_API_KEY as string, {
  logLevel: Types.LogLevel.Debug,
})

export async function POST(req: NextRequest) {
  // Get track event and properties from request body
  const body = await req.json()
  const { event, properties, device } = body as {
    event: string
    properties: Record<string, unknown>
    device: {
      device_id: string
    }
  }
  console.debug(`track ${event}`, properties, device)

  // Start the track request but don't wait for it
  track(event, properties, device).promise.catch(err => {
    console.error(err)
  })

  // Immediately send back a success status
  return NextResponse.json({ message: 'Track request started' })
}
