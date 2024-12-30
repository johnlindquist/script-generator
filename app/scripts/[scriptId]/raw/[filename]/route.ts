import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Context = {
  params: {
    scriptId: string
    filename: string
  }
}

export async function GET(request: NextRequest, { params }: Context) {
  const { scriptId, filename } = params

  try {
    const script = await prisma.script.findUnique({
      where: { id: scriptId },
      select: {
        id: true,
        content: true,
        dashedName: true,
      },
    })

    if (!script) {
      return new NextResponse('Script not found', { status: 404 })
    }

    // Remove .ts extension if present for comparison
    const requestedName = filename.endsWith('.ts') ? filename.slice(0, -3) : filename

    // If script has a dashedName, validate it matches
    if (script.dashedName && requestedName !== script.dashedName) {
      return new NextResponse('Invalid filename', { status: 404 })
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
