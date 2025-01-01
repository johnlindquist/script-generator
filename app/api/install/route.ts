import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { shouldLockScript } from '@/lib/scripts'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const headersList = await headers()
  const forwardedFor = headersList.get('x-forwarded-for')
  const ip = forwardedFor?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown'

  const { scriptId } = await request.json()

  if (!scriptId) {
    return NextResponse.json({ error: 'Script ID is required' }, { status: 400 })
  }

  try {
    // Get the script to check ownership
    const script = await prisma.script.findUnique({
      where: { id: scriptId },
      select: { ownerId: true },
    })

    if (!script) {
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
    await prisma.install.create({
      data: {
        ip,
        scriptId,
        userId: session?.user?.id, // Optional: track user if they're logged in
      },
    })

    // If user is logged in and not the owner, check if script should be locked
    if (session?.user?.id && session.user.id !== script.ownerId) {
      const shouldLock = await shouldLockScript(scriptId)
      if (shouldLock) {
        await prisma.script.update({
          where: { id: scriptId },
          data: { locked: true },
        })
      }
    }

    // Get updated install count
    const installCount = await prisma.install.count({
      where: { scriptId },
    })

    return NextResponse.json({
      isInstalled: true,
      installCount,
    })
  } catch (error) {
    console.error('Install error:', error)
    return NextResponse.json({ error: 'Failed to track install' }, { status: 500 })
  }
}
