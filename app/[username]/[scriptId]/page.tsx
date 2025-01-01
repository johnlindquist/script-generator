import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import ScriptCard from '@/components/ScriptCard'

export default async function ScriptPage({
  params,
}: {
  params: { username: string; scriptId: string }
}) {
  const session = await getServerSession(authOptions)
  const user = await prisma.user.findUnique({
    where: { username: params.username },
  })

  if (!user) {
    notFound()
  }

  const script = await prisma.script.findFirst({
    where: {
      id: params.scriptId,
      ownerId: user.id,
    },
    include: {
      owner: true,
      _count: {
        select: {
          verifications: true,
          favorites: true,
          installs: true,
        },
      },
    },
  })

  if (!script) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black px-8 py-4">
      <div className="container mx-auto px-4 py-8">
        <ScriptCard
          script={{
            ...script,
            isVerified: false,
            isFavorited: false,
          }}
          isAuthenticated={!!session}
          currentUserId={session?.user?.id}
        />
      </div>
    </main>
  )
}
