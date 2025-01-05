import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { shouldLockScript } from '@/lib/scripts'
import { generateDashedName } from '@/lib/names'
import { parseScriptFromMarkdown } from '@/lib/generation'
import { Prisma } from '@prisma/client'

const PAGE_SIZE = 12

// Migration endpoint to update existing scripts
export async function PUT() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all scripts that have favorites, verifications, or installs
  const scripts = await prisma.script.findMany({
    where: {
      OR: [
        { favorites: { some: {} } },
        { verifications: { some: {} } },
        { installs: { some: {} } },
      ],
      locked: false,
    },
    select: {
      id: true,
      ownerId: true,
      favorites: { select: { userId: true } },
      verifications: { select: { userId: true } },
      installs: { select: { userId: true } },
    },
  })

  console.log('Migration Debug - Found Scripts:', {
    count: scripts.length,
  })

  const updatedScripts = []
  for (const script of scripts) {
    const shouldLock = await shouldLockScript(script.id)
    if (shouldLock) {
      await prisma.script.update({
        where: { id: script.id },
        data: { locked: true },
      })
      updatedScripts.push(script.id)
      console.log('Migration Debug - Locked Script:', {
        scriptId: script.id,
        ownerId: script.ownerId,
      })
    }
  }

  return NextResponse.json({
    message: 'Migration complete',
    updatedScripts,
  })
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const limit = Number(searchParams.get('limit') ?? PAGE_SIZE)
  const sort = searchParams.get('sort') || 'alphabetical'

  // Add search functionality
  const searchTerm = searchParams.get('query')?.trim() || ''

  // Base where clause
  const whereClause: Prisma.ScriptWhereInput = {
    status: 'ACTIVE',
    saved: true,
  }

  // Add search condition if search term is provided
  if (searchTerm) {
    whereClause.content = {
      contains: searchTerm,
      mode: 'insensitive',
    }
    console.log('🔍 Search request:', {
      searchTerm,
      page,
      limit,
      whereClause,
    })
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
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        content: true,
        saved: true,
        locked: true,
        createdAt: true,
        dashedName: true,
        owner: {
          select: {
            username: true,
            id: true,
            fullName: true,
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
          : {
              select: {
                id: true,
              },
              take: 0,
            },
        favorites: session?.user?.id
          ? {
              where: {
                userId: session.user.id,
              },
              select: {
                id: true,
              },
            }
          : {
              select: {
                id: true,
              },
              take: 0,
            },
      },
    }),
  ])

  if (searchTerm) {
    console.log('🔍 Search results:', {
      searchTerm,
      totalResults: totalScripts,
      resultsOnPage: scripts.length,
      page,
      matches: scripts.map(script => {
        const content = script.content
        const lines = content.split('\n')
        const matchingLines = lines
          .map((line, i) => ({ line, lineNumber: i + 1 }))
          .filter(({ line }) => line.toLowerCase().includes(searchTerm.toLowerCase()))
        return {
          title: script.title,
          matchingLines: matchingLines.map(({ line, lineNumber }) => ({
            lineNumber,
            line: line.trim(),
          })),
        }
      }),
    })
  }

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
    ...(searchTerm ? { searchTerm } : {}),
  })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { prompt, code } = await request.json()

  if (!prompt || !code) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Parse out metadata including "// Name:" from code
  const { name } = parseScriptFromMarkdown(code)
  const shortName = name || prompt.split(' ').slice(0, 9).join(' ')
  const dashedName = generateDashedName(shortName)

  const script = await prisma.script.create({
    data: {
      title: shortName,
      content: code,
      saved: true,
      status: 'ACTIVE',
      ownerId: session.user.id,
      dashedName,
    },
  })

  return NextResponse.json(script)
}
