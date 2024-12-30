import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: { scriptId: string } }) {
  try {
    const script = await prisma.script.findUnique({
      where: { id: params.scriptId },
    })

    if (!script) {
      return new NextResponse('Script not found', { status: 404 })
    }

    return new NextResponse(script.content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Error fetching raw script:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
