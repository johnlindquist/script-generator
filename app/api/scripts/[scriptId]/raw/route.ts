import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Context = {
  params: Promise<{ scriptId: string }>
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const params = await context.params
    const script = await prisma.script.findUnique({
      where: { id: params.scriptId },
      select: {
        id: true,
        content: true,
        dashedName: true,
        createdAt: true,
      },
    })

    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    const version = new Date(script.createdAt).getTime().toString()

    // Return just the raw content with text/plain content type and caching headers
    return new NextResponse(script.content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `inline; filename="${script.dashedName || 'script'}.ts"`,
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        ETag: version,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to get script: ${errorMessage}` }, { status: 500 })
  }
}
