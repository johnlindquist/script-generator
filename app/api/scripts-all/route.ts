import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const scripts = await prisma.script.findMany({
      where: {
        status: 'ACTIVE',
        saved: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        _count: {
          select: {
            favorites: true,
            installs: true,
            verifications: true,
          },
        },
      },
    })

    const response = NextResponse.json({ scripts })
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30')
    return response
  } catch (error) {
    console.error('Error fetching all scripts:', error)
    return NextResponse.json({ error: 'Failed to fetch scripts' }, { status: 500 })
  }
}
