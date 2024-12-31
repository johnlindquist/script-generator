import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../auth/[...nextauth]/route'
import { wrapApiHandler } from '@/lib/timing'

const toggleFavorite = async (req: NextRequest) => {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { scriptId } = await req.json()
    if (!scriptId) {
      return NextResponse.json({ error: 'Script ID is required' }, { status: 400 })
    }

    // Check if script exists
    const script = await prisma.script.findUnique({
      where: { id: scriptId },
    })

    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    // Check if user already favorited this script
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_scriptId: {
          userId: session.user.id,
          scriptId,
        },
      },
    })

    let isFavorited: boolean
    if (existingFavorite) {
      // Remove favorite if it exists
      await prisma.favorite.delete({
        where: { id: existingFavorite.id },
      })
      isFavorited = false
    } else {
      // Create new favorite if it doesn't exist
      await prisma.favorite.create({
        data: {
          userId: session.user.id,
          scriptId,
        },
      })
      isFavorited = true
    }

    // Get updated favorite count
    const favoriteCount = await prisma.favorite.count({
      where: { scriptId },
    })

    return NextResponse.json({ isFavorited, favoriteCount })
  } catch (error) {
    console.error('Favorite error:', error)
    return NextResponse.json({ error: 'Failed to toggle favorite' }, { status: 500 })
  }
}

export const POST = wrapApiHandler('toggle_favorite', toggleFavorite)
