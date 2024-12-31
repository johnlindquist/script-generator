import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

const PAGE_SIZE = 12

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))

  const [totalScripts, scripts] = await Promise.all([
    prisma.script.count({
      where: {
        status: 'ACTIVE',
        saved: true,
      },
    }),
    prisma.script.findMany({
      where: {
        status: 'ACTIVE',
        saved: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        content: true,
        saved: true,
        createdAt: true,
        dashedName: true,
        owner: {
          select: {
            username: true,
            id: true,
          },
        },
        _count: {
          select: {
            verifications: true,
            favorites: true,
            installs: true,
          },
        },
        verifications: session?.user?.id
          ? {
              where: {
                userId: session.user.id,
              },
              select: {
                id: true,
              },
            }
          : false,
        favorites: session?.user?.id
          ? {
              where: {
                userId: session.user.id,
              },
              select: {
                id: true,
              },
            }
          : false,
      },
    }),
  ])

  const totalPages = Math.ceil(totalScripts / PAGE_SIZE)

  const formattedScripts = scripts.map(script => ({
    ...script,
    isVerified: script.verifications ? script.verifications.length > 0 : false,
    isFavorited: script.favorites ? script.favorites.length > 0 : false,
  }))

  return NextResponse.json({
    scripts: formattedScripts,
    totalPages,
    currentPage: page,
  })
}
