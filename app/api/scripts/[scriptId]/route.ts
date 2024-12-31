import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { wrapApiHandler } from '@/lib/timing'

interface Context {
  params: {
    scriptId: string
  }
}

const deleteScript = async (request: NextRequest, context: Context) => {
  try {
    const params = await context.params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const script = await prisma.script.findUnique({
      where: { id: params.scriptId },
    })

    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    if (script.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this script' }, { status: 403 })
    }

    await prisma.$transaction([
      prisma.verification.deleteMany({
        where: { scriptId: params.scriptId },
      }),
      prisma.scriptVersion.deleteMany({
        where: { scriptId: params.scriptId },
      }),
      prisma.script.delete({
        where: { id: params.scriptId },
      }),
    ])

    return NextResponse.json({ message: 'Script deleted successfully' })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to delete script: ${errorMessage}` }, { status: 500 })
  }
}

const getScript = async (request: NextRequest, context: Context) => {
  try {
    const params = await context.params
    const script = await prisma.script.findUnique({
      where: { id: params.scriptId },
      include: { owner: true },
    })

    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    return NextResponse.json(script)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to get script: ${errorMessage}` }, { status: 500 })
  }
}

const updateScript = async (request: NextRequest, context: Context) => {
  try {
    const params = await context.params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const script = await prisma.script.findUnique({
      where: { id: params.scriptId },
    })

    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    if (script.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized to modify this script' }, { status: 403 })
    }

    const { saved } = await request.json()

    const updatedScript = await prisma.script.update({
      where: { id: params.scriptId },
      data: { saved },
    })

    return NextResponse.json(updatedScript)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to update script: ${errorMessage}` }, { status: 500 })
  }
}

export const DELETE = wrapApiHandler('delete_script', deleteScript)
export const GET = wrapApiHandler('get_script', getScript)
export const PATCH = wrapApiHandler('update_script', updateScript)
