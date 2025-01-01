import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: { scriptId: string } }) {
  const script = await prisma.script.findUnique({
    where: { id: params.scriptId },
    include: { owner: true },
  })

  if (!script) {
    return new NextResponse('Script not found', { status: 404 })
  }

  const url = new URL(request.url)
  return NextResponse.redirect(
    `${url.origin}/${script.owner.username}/${script.id}/raw/${script.dashedName || 'script'}.ts`
  )
}
