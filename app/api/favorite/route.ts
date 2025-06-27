import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../auth/[...nextauth]/route'
import { wrapApiHandler } from '@/lib/timing'
import { shouldLockScript } from '@/lib/scripts'
import { debugLog } from '@/lib/debug'
import { logInteraction } from '@/lib/interaction-logger'
import { FavoriteRequestSchema } from '@/lib/schemas'

const toggleFavorite = async (req: NextRequest) => {
  const interactionTimestamp = req.headers.get('Interaction-Timestamp') || new Date().toISOString()

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      debugLog('favorite', 'Unauthorized - No valid user ID')
      await logInteraction(interactionTimestamp, 'serverRoute', 'Unauthorized', {
        userId: session?.user?.id,
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const rawBody = await req.json()
    const parseResult = FavoriteRequestSchema.safeParse(rawBody)

    if (!parseResult.success) {
      await logInteraction(interactionTimestamp, 'serverRoute', 'Invalid favorite request body', {
        errors: parseResult.error.errors,
      })
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.errors }, { status: 400 })
    }

    const { scriptId } = parseResult.data

    // Check if script exists
    const script = await prisma.script.findUnique({
      where: { id: scriptId },
    })

    if (!script) {
      debugLog('favorite', 'Script not found', { scriptId })
      await logInteraction(interactionTimestamp, 'serverRoute', 'Script not found', {
        userId: session.user.id,
        scriptId,
      })
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    debugLog('favorite', 'Processing favorite toggle', {
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
      debugLog('favorite', 'Removed favorite', {
        scriptId,
        userId: session.user.id,
      })
      await logInteraction(interactionTimestamp, 'serverRoute', 'Script unfavorited', {
        userId: session.user.id,
        scriptId,
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
      debugLog('favorite', 'Added favorite', {
        scriptId,
        userId: session.user.id,
      })
      await logInteraction(interactionTimestamp, 'serverRoute', 'Script favorited', {
        userId: session.user.id,
        scriptId,
      })

      // Check if script should be locked
      if (session.user.id !== script.ownerId) {
        debugLog('favorite', 'Checking script lock', {
          scriptId,
          userId: session.user.id,
          ownerId: script.ownerId,
        })
        const shouldLock = await shouldLockScript(scriptId)
        debugLog('favorite', 'Lock check result', {
          scriptId,
          shouldLock,
        })
        if (shouldLock) {
          await prisma.script.update({
            where: { id: scriptId },
            data: { locked: true },
          })
          debugLog('favorite', 'Script locked', { scriptId })
        }
      }
    }

    // Get updated favorite count
    const favoriteCount = await prisma.favorite.count({
      where: { scriptId },
    })

    debugLog('favorite', 'Favorite toggle complete', {
      scriptId,
      isFavorited,
      favoriteCount,
    })

    return NextResponse.json({ isFavorited, favoriteCount })
  } catch (error) {
    debugLog('favorite', 'Error toggling favorite', {
      error: error instanceof Error ? error.message : String(error),
    })
    await logInteraction(interactionTimestamp, 'serverRoute', 'Error in favorite route', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Failed to toggle favorite' }, { status: 500 })
  }
}

export const POST = wrapApiHandler('toggle_favorite', toggleFavorite)
