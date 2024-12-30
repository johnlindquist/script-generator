import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: { scriptId: string } }) {
  try {
    const script = await prisma.script.findUnique({
      where: { id: params.scriptId },
      select: {
        id: true,
        content: true,
        dashedName: true,
      },
    })

    if (!script) {
      return new NextResponse('Script not found', { status: 404 })
    }

    // If we have a dashedName, redirect to the new URL format
    if (script.dashedName) {
      const url = new URL(request.url)
      return NextResponse.redirect(`${url.origin}/scripts/${script.id}/raw/${script.dashedName}.ts`)
    }

    // Fallback to directly returning content if no dashedName
    return new NextResponse(script.content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'inline; filename="script.ts"',
      },
    })
  } catch (error) {
    console.error('Error fetching raw script:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
