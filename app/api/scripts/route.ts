import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { shouldLockScript } from '@/lib/scripts'
import { generateDashedName } from '@/lib/names'
import { parseScriptFromMarkdown } from '@/lib/generation'
import { Prisma } from '@prisma/client'
import { NextSuggestionsSchema } from '@/lib/schemas'
import { logInteraction } from '@/lib/interaction-logger'

const PAGE_SIZE = 18 // Changed to 18 for better grid layout (6 rows of 3)

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
  const offset = Number(searchParams.get('offset') ?? '0')
  const sort = await searchParams.get('sort') || 'createdAt'

  // Add search functionality
  const searchTerm = searchParams.get('query')?.trim() || ''

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
      skip: offset > 0 ? offset : (page - 1) * limit,
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
        const lines = script.content.split('\n')
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

  const result = {
    scripts: formattedScripts,
    totalPages,
    currentPage: page,
    ...(searchTerm ? { searchTerm } : {}),
  }

  // Build the response and add caching headers:
  const response = NextResponse.json(result)
  if (!session) {
    // For public (non-user‑specific) data, cache at the edge for 60 seconds
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30')
  } else {
    // For user-specific responses, disable caching
    response.headers.set('Cache-Control', 'private, max-age=0, no-cache')
  }

  return response
}

export async function POST(request: NextRequest) {
  const interactionTimestamp = request.headers.get('Interaction-Timestamp') || new Date().toISOString()

  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      await logInteraction(interactionTimestamp, 'serverRoute', 'POST /api/scripts - Unauthorized', {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasUserId: !!session?.user?.id,
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const rawBody = await request.json()
    const parseResult = NextSuggestionsSchema.safeParse(rawBody)

    if (!parseResult.success) {
      await logInteraction(interactionTimestamp, 'serverRoute', 'Invalid scripts request body', {
        errors: parseResult.error.errors,
        userId: session.user.id,
      })
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.errors }, { status: 400 })
    }

    const { prompt, code, saved } = parseResult.data

    // Validate required fields
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      console.error('POST /api/scripts - Code is missing or invalid')
      return NextResponse.json(
        { error: 'Code is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Parse out metadata including "// Name:" from code
    const { name } = parseScriptFromMarkdown(code)
    const title = name || prompt?.slice(0, 50) || 'Untitled Script'
    const dashedName = generateDashedName(title)

    console.log('POST /api/scripts - Creating script:', {
      title,
      hasPrompt: !!prompt,
      hasCode: !!code,
      userId: session.user.id,
      dashedName,
    })

    const script = await prisma.script.create({
      data: {
        title,
        content: code,
        prompt: prompt || '', // Include the prompt field
        saved: saved !== false, // Default to true if not specified
        status: 'ACTIVE',
        ownerId: session.user.id,
        dashedName,
      },
    })

    console.log('POST /api/scripts - Script created successfully:', script.id)
    return NextResponse.json(script)
  } catch (error) {
    console.error('POST /api/scripts - Error creating script:', error)

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle specific Prisma errors
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'A script with this name already exists' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        {
          error: 'Database error',
          details: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to save script',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
