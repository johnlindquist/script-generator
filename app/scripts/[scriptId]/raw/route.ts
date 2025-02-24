import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: { scriptId: string } }) {
  const script = await prisma.script.findUnique({
    where: { id: params.scriptId },
    select: {
      id: true,
      dashedName: true,
      createdAt: true, // For cache busting version
      owner: {
        select: {
          username: true,
        },
      },
    },
  })

  if (!script) {
    return new NextResponse('Script not found', { status: 404 })
  }

  const url = new URL(request.url)
  const version = new Date(script.createdAt).getTime().toString()
  return NextResponse.redirect(
    `${url.origin}/${script.owner.username}/${script.id}/raw/${script.dashedName || 'script'}.ts?v=${version}`
  )
}
