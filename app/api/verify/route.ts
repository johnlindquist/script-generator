import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../auth/[...nextauth]/route'

export async function POST(req: NextRequest) {
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

    // Prevent owners from verifying their own scripts
    if (script.ownerId === session.user.id) {
      return NextResponse.json({ error: "You can't verify your own script" }, { status: 403 })
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
      // Remove verification if it exists
      await prisma.verification.delete({
        where: { id: existingVerification.id },
      })
      isVerified = false
    } else {
      // Create new verification if it doesn't exist
      await prisma.verification.create({
        data: {
          userId: session.user.id,
          scriptId,
        },
      })
      isVerified = true
    }

    // Get updated verification count
    const verifiedCount = await prisma.verification.count({
      where: { scriptId },
    })

    return NextResponse.json({ isVerified, verifiedCount })
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json({ error: 'Failed to toggle verification' }, { status: 500 })
  }
}
