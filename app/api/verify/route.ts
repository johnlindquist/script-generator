import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../auth/[...nextauth]/route'
import { shouldLockScript } from '@/lib/scripts'
import { debugLog } from '@/lib/debug'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      debugLog('verify', 'Unauthorized - No valid user ID')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { scriptId } = await req.json()
    if (!scriptId) {
      debugLog('verify', 'Missing script ID')
      return NextResponse.json({ error: 'Script ID is required' }, { status: 400 })
    }

    // Check if script exists
    const script = await prisma.script.findUnique({
      where: { id: scriptId },
    })

    if (!script) {
      debugLog('verify', 'Script not found', { scriptId })
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    // Prevent owners from verifying their own scripts
    if (script.ownerId === session.user.id) {
      debugLog('verify', 'Owner attempted to verify own script', {
        scriptId,
        userId: session.user.id,
      })
      return NextResponse.json({ error: "You can't verify your own script" }, { status: 403 })
    }

    debugLog('verify', 'Processing verification', {
      scriptId,
      userId: session.user.id,
      ownerId: script.ownerId,
    })

    // Check if user already verified this script
    const existingVerification = await prisma.verification.findUnique({
      where: {
        userId_scriptId: {
          userId: session.user.id,
          scriptId,
        },
      },
    })

    let isVerified: boolean
    if (existingVerification) {
      // Remove verification if it exists
      await prisma.verification.delete({
        where: { id: existingVerification.id },
      })
      isVerified = false
      debugLog('verify', 'Removed verification', {
        scriptId,
        userId: session.user.id,
      })
    } else {
      // Create new verification if it doesn't exist
      await prisma.verification.create({
        data: {
          userId: session.user.id,
          scriptId,
        },
      })
      isVerified = true
      debugLog('verify', 'Added verification', {
        scriptId,
        userId: session.user.id,
      })

      // Check if script should be locked (since this is a non-owner verification)
      debugLog('verify', 'Checking script lock', {
        scriptId,
        userId: session.user.id,
      })
      const shouldLock = await shouldLockScript(scriptId)
      debugLog('verify', 'Lock check result', {
        scriptId,
        shouldLock,
      })
      if (shouldLock) {
        await prisma.script.update({
          where: { id: scriptId },
          data: { locked: true },
        })
        debugLog('verify', 'Script locked', { scriptId })
      }
    }

    // Get updated verification count
    const verifiedCount = await prisma.verification.count({
      where: { scriptId },
    })

    debugLog('verify', 'Verification toggle complete', {
      scriptId,
      isVerified,
      verifiedCount,
    })

    return NextResponse.json({ isVerified, verifiedCount })
  } catch (error) {
    debugLog('verify', 'Error toggling verification', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Failed to toggle verification' }, { status: 500 })
  }
}
