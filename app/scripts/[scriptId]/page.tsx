import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export default async function OldScriptPage({ params }: { params: { scriptId: string } }) {
  const script = await prisma.script.findUnique({
    where: { id: params.scriptId },
    include: { owner: true },
  })

  if (!script) {
    redirect('/')
  }

  redirect(`/${script.owner.username}/${script.id}`)
}
