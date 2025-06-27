import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { logInteraction } from '@/lib/interaction-logger'
import { VerifyRequestSchema } from '@/lib/schemas'

export async function POST(req: NextRequest) {
  const interactionTimestamp = req.headers.get('Interaction-Timestamp') || new Date().toISOString()

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const rawBody = await req.json()
    const parseResult = VerifyRequestSchema.safeParse(rawBody)

    if (!parseResult.success) {
      await logInteraction(interactionTimestamp, 'serverRoute', 'Invalid verify request body', {
        errors: parseResult.error.errors,
      })
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.errors }, { status: 400 })
    }

    const { scriptId } = parseResult.data

    // Check if script exists and user has permission
    const script = await prisma.script.findFirst({
      where: {
        id: scriptId,
        ownerId: session.user.id,
      },
    })

    if (!script) {
      await logInteraction(interactionTimestamp, 'serverRoute', 'Script not found for verification', {
        userId: session.user.id,
        scriptId,
      })
      return NextResponse.json({ error: 'Script not found or unauthorized' }, { status: 404 })
    }

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
      // Remove verification
      await prisma.verification.delete({
        where: {
          userId_scriptId: {
            userId: session.user.id,
            scriptId,
          },
        },
      })
      isVerified = false
    } else {
      // Add verification
      await prisma.verification.create({
        data: {
          userId: session.user.id,
          scriptId,
        },
      })
      isVerified = true
    }

    await logInteraction(interactionTimestamp, 'serverRoute', 'Script verification toggled', {
      userId: session.user.id,
      scriptId,
      verified: isVerified,
    })

    return NextResponse.json({
      verified: isVerified,
      script
    })
  } catch (error) {
    await logInteraction(interactionTimestamp, 'serverRoute', 'Error in verify route', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
