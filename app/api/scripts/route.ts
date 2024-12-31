import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { generateDashedName, generateUppercaseName } from '@/lib/names'

export async function GET(request: Request) {
  try {
    // Get the current user's session
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    // Extract query params from the request URL
    const { searchParams } = new URL(request.url)
    const pageParam = searchParams.get('page') || '1'

    // Convert to integers and clamp to safe ranges
    let page = parseInt(pageParam, 10)
    const PAGE_SIZE = 12 // Fixed page size of 12

    // Basic validation and clamping
    if (isNaN(page) || page < 1) page = 1

    // Calculate the skip value for Prisma
    const skip = (page - 1) * PAGE_SIZE

    // Query the scripts with pagination
    const scripts = await prisma.script.findMany({
      where: {
        status: 'ACTIVE',
        saved: true, // Only return saved scripts
      },
      skip,
      take: PAGE_SIZE,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: true,
        _count: {
          select: {
            verifications: true,
            favorites: true,
          },
        },
        verifications: userId
          ? {
              where: {
                userId,
              },
            }
          : false,
        favorites: userId
          ? {
              where: {
                userId,
              },
            }
          : false,
      },
    })

    // Transform the scripts to include isVerified and isFavorited
    const transformedScripts = scripts.map(script => ({
      ...script,
      isVerified: script.verifications ? script.verifications.length > 0 : false,
      isFavorited: script.favorites ? script.favorites.length > 0 : false,
      verifications: undefined, // Remove the verifications array from the response
      favorites: undefined, // Remove the favorites array from the response
    }))

    // Get total count for pagination info
    const totalScripts = await prisma.script.count({
      where: {
        status: 'ACTIVE',
        saved: true, // Only count saved scripts
      },
    })

    return NextResponse.json({
      scripts: transformedScripts,
      totalScripts,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(totalScripts / PAGE_SIZE),
    })
  } catch (error) {
    console.error('Failed to fetch scripts:', error)
    return NextResponse.json({ error: 'Failed to fetch scripts' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { prompt, code, saved } = await request.json()

    if (!prompt || !code) {
      return NextResponse.json({ error: 'Prompt and code are required' }, { status: 400 })
    }

    const script = await prisma.script.create({
      data: {
        title: prompt.split('\n')[0].slice(0, 50),
        summary: prompt,
        content: code,
        ownerId: session.user.id,
        saved: saved ?? false,
        dashedName: generateDashedName(prompt.split('\n')[0].slice(0, 50)),
        uppercaseName: generateUppercaseName(prompt.split('\n')[0].slice(0, 50)),
      },
      include: {
        owner: true,
      },
    })

    return NextResponse.json(script)
  } catch (error) {
    console.error('Failed to create script:', error)
    return NextResponse.json({ error: 'Failed to create script' }, { status: 500 })
  }
}
