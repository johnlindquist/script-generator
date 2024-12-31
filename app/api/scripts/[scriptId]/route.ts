import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../../auth/[...nextauth]/route'
import { generateDashedName, generateUppercaseName } from '@/lib/names'

type Context = {
  params: Promise<{ scriptId: string }>
}

export async function PUT(request: NextRequest, context: Context) {
  const params = await context.params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content } = await request.json()

    const script = await prisma.script.findUnique({
      where: { id: params.scriptId },
    })

    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    if (script.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updatedScript = await prisma.script.update({
      where: { id: params.scriptId },
      data: {
        content,
        dashedName: generateDashedName(script.title),
        uppercaseName: generateUppercaseName(script.title),
      },
    })

    return NextResponse.json(updatedScript)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to update script: ${errorMessage}` }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: Context) {
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

export async function GET(request: NextRequest, context: Context) {
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

export async function PATCH(request: NextRequest, context: Context) {
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
