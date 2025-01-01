import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string; scriptId: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { username: params.username },
    })

    if (!user) {
      return new NextResponse('User not found', { status: 404 })
    }

    const script = await prisma.script.findFirst({
      where: {
        id: params.scriptId,
        ownerId: user.id,
      },
      select: {
        id: true,
        content: true,
        dashedName: true,
      },
    })

    if (!script) {
      return new NextResponse('Script not found', { status: 404 })
    }

    return new NextResponse(script.content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `inline; filename="${script.dashedName || 'script'}.ts"`,
      },
    })
  } catch (error) {
    console.error('Error fetching raw script:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
