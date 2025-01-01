import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: { username: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get('page')) || 1
    const pageSize = 12

    const user = await prisma.user.findFirst({
      where: { username: params.username },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const scripts = await prisma.script.findMany({
      where: {
        ownerId: user.id,
        status: 'ACTIVE',
        saved: true,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        owner: true,
        _count: {
          select: {
            verifications: true,
            favorites: true,
            installs: true,
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    const totalScripts = await prisma.script.count({
      where: {
        ownerId: user.id,
        status: 'ACTIVE',
        saved: true,
      },
    })

    return NextResponse.json({
      scripts: scripts.map(script => ({
        ...script,
        isVerified: false,
        isFavorited: false,
      })),
      totalPages: Math.ceil(totalScripts / pageSize),
      currentPage: page,
    })
  } catch (error) {
    console.error('Error fetching scripts:', error)
    return NextResponse.json({ error: 'Failed to fetch scripts' }, { status: 500 })
  }
}
