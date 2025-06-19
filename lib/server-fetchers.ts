import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { ScriptsResponse, ScriptLite } from '@/types/script'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

const PAGE_SIZE = 18 // Changed to 18 for better grid layout (6 rows of 3)

export async function fetchScriptsServerSide(searchParams?: {
  sort?: string
  page?: string
  query?: string
}): Promise<ScriptsResponse> {
  const session = await getServerSession(authOptions)
  const page = Math.max(1, Number(searchParams?.page ?? '1'))
  const sort = searchParams?.sort || 'createdAt'
  const searchTerm = searchParams?.query?.trim() || ''

  // Base where clause
  const whereClause: Prisma.ScriptWhereInput = {
    status: 'ACTIVE',
    saved: true,
  }

  // Add search condition if search term is provided
  if (searchTerm) {
    whereClause.OR = [
      {
        content: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      },
      {
        title: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      },
      {
        owner: {
          username: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
      },
    ]
  }

  // Build orderBy based on sort parameter
  let orderBy: Prisma.ScriptOrderByWithRelationInput = {}
  switch (sort) {
    case 'createdAt':
      orderBy = { createdAt: 'desc' }
      break
    case 'username':
      orderBy = {
        owner: {
          username: 'asc',
        },
      }
      break
    case 'favorites':
      orderBy = {
        favorites: {
          _count: 'desc',
        },
      }
      break
    case 'downloads':
      orderBy = {
        installs: {
          _count: 'desc',
        },
      }
      break
    case 'verified':
      orderBy = {
        verifications: {
          _count: 'desc',
        },
      }
      break
    default:
      // 'alphabetical'
      orderBy = { title: 'asc' }
      break
  }

  const [totalScripts, scripts] = await Promise.all([
    prisma.script.count({
      where: whereClause,
    }),
    prisma.script.findMany({
      where: whereClause,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        owner: {
          include: {
            sponsorship: true,
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

  const formattedScripts: ScriptLite[] = scripts.map(script => ({
    ...script,
    isVerified: Array.isArray(script.verifications) && script.verifications.length > 0,
    isFavorited: Array.isArray(script.favorites) && script.favorites.length > 0,
  }))

  return {
    scripts: formattedScripts,
    totalPages,
    currentPage: page,
    ...(searchTerm ? { searchTerm } : {}),
  }
}
