import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { logInteraction } from '@/lib/interaction-logger'
import { InstallRequestSchema } from '@/lib/schemas'

export async function POST(req: NextRequest) {
  const interactionTimestamp = req.headers.get('Interaction-Timestamp') || new Date().toISOString()

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const rawBody = await req.json()
    const parseResult = InstallRequestSchema.safeParse(rawBody)

    if (!parseResult.success) {
      await logInteraction(interactionTimestamp, 'serverRoute', 'Invalid install request body', {
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
      await logInteraction(interactionTimestamp, 'serverRoute', 'Script not found for installation', {
        userId: session.user.id,
        scriptId,
      })
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    // Get IP address for install tracking
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      '0.0.0.0'

    // Check if already installed from this IP recently (last 24 hours)
    const existingInstall = await prisma.install.findFirst({
      where: {
        scriptId,
        ip,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    })

    if (existingInstall) {
      await logInteraction(interactionTimestamp, 'serverRoute', 'Script already installed', {
        userId: session.user.id,
        scriptId,
        ip,
      })
      return NextResponse.json({
        installed: true,
        message: 'Script already installed recently'
      })
    }

    // Create installation record
    await prisma.install.create({
      data: {
        userId: session.user.id,
        scriptId,
        ip,
      },
    })

    // Get install count for response
    const installCount = await prisma.install.count({
      where: { scriptId },
    })

    await logInteraction(interactionTimestamp, 'serverRoute', 'Script installed', {
      userId: session.user.id,
      scriptId,
    })

    return NextResponse.json({
      installed: true,
      installCount,
      message: 'Script installed successfully'
    })
  } catch (error) {
    await logInteraction(interactionTimestamp, 'serverRoute', 'Error in install route', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
