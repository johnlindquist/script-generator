import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../auth/[...nextauth]/route'
import { wrapApiHandler } from '@/lib/timing'
import { shouldLockScript } from '@/lib/scripts'

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

    console.log('toggleFavorite Debug - Initial:', {
      scriptId,
      userId: session.user.id,
      ownerId: script.ownerId,
      isOwner: session.user.id === script.ownerId,
    })

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
      console.log('toggleFavorite Debug - Unfavorited:', {
        scriptId,
        userId: session.user.id,
      })
    } else {
      // Create new favorite if it doesn't exist
      await prisma.favorite.create({
        data: {
          userId: session.user.id,
          scriptId,
        },
      })
      isFavorited = true
      console.log('toggleFavorite Debug - Favorited:', {
        scriptId,
        userId: session.user.id,
      })

      // Check if script should be locked
      if (session.user.id !== script.ownerId) {
        console.log('toggleFavorite Debug - Checking Lock:', {
          scriptId,
          userId: session.user.id,
          ownerId: script.ownerId,
        })
        const shouldLock = await shouldLockScript(scriptId)
        console.log('toggleFavorite Debug - Lock Result:', {
          scriptId,
          shouldLock,
        })
        if (shouldLock) {
          await prisma.script.update({
            where: { id: scriptId },
            data: { locked: true },
          })
          console.log('toggleFavorite Debug - Script Locked:', {
            scriptId,
          })
        }
      }
    }

    // Get updated favorite count
    const favoriteCount = await prisma.favorite.count({
      where: { scriptId },
    })

    console.log('toggleFavorite Debug - Final:', {
      scriptId,
      isFavorited,
      favoriteCount,
    })

    return NextResponse.json({ isFavorited, favoriteCount })
  } catch (error) {
    console.error('Favorite error:', error)
    return NextResponse.json({ error: 'Failed to toggle favorite' }, { status: 500 })
  }
}

export const POST = wrapApiHandler('toggle_favorite', toggleFavorite)
