import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { shouldLockScript } from '@/lib/scripts'
import { debugLog } from '@/lib/debug'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const headersList = await headers()
  const forwardedFor = headersList.get('x-forwarded-for')
  const ip = forwardedFor?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown'

  const { scriptId } = await request.json()

  if (!scriptId) {
    debugLog('install', 'Missing script ID')
    return NextResponse.json({ error: 'Script ID is required' }, { status: 400 })
  }

  try {
    debugLog('install', 'Processing install request', {
      scriptId,
      userId: session?.user?.id,
      ip,
    })

    // Get the script to check ownership
    const script = await prisma.script.findUnique({
      where: { id: scriptId },
      select: { ownerId: true },
    })

    if (!script) {
      debugLog('install', 'Script not found', { scriptId })
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    // Check if this IP has installed this script in the last 24 hours
    const recentInstall = await prisma.install.findFirst({
      where: {
        scriptId,
        ip,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    })

    if (recentInstall) {
      debugLog('install', 'Recent install found', {
        scriptId,
        ip,
        userId: session?.user?.id,
      })
      // If already installed from this IP in last 24 hours, just return current count
      const installCount = await prisma.install.count({
        where: { scriptId },
      })
      return NextResponse.json({
        isInstalled: true,
        installCount,
        message: 'Already installed recently',
      })
    }

    // Create new install
    debugLog('install', 'Creating new install record', {
      scriptId,
      ip,
      userId: session?.user?.id,
    })
    await prisma.install.create({
      data: {
        ip,
        scriptId,
        userId: session?.user?.id, // Optional: track user if they're logged in
      },
    })

    // If user is logged in and not the owner, check if script should be locked
    if (session?.user?.id && session.user.id !== script.ownerId) {
      debugLog('install', 'Checking script lock', {
        scriptId,
        userId: session.user.id,
        ownerId: script.ownerId,
      })
      const shouldLock = await shouldLockScript(scriptId)
      debugLog('install', 'Lock check result', {
        scriptId,
        shouldLock,
      })
      if (shouldLock) {
        await prisma.script.update({
          where: { id: scriptId },
          data: { locked: true },
        })
        debugLog('install', 'Script locked', { scriptId })
      }
    }

    // Get updated install count
    const installCount = await prisma.install.count({
      where: { scriptId },
    })

    debugLog('install', 'Install complete', {
      scriptId,
      installCount,
      userId: session?.user?.id,
    })

    return NextResponse.json({
      isInstalled: true,
      installCount,
    })
  } catch (error) {
    debugLog('install', 'Error tracking install', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Failed to track install' }, { status: 500 })
  }
}
