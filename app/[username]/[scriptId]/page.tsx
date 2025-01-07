import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import ScriptCard from '@/components/ScriptCard'

export default async function ScriptPage({
  params,
}: {
  params: Promise<{ username: string; scriptId: string }>
}) {
  const { username, scriptId } = await params
  const session = await getServerSession(authOptions)
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      sponsorship: true,
    },
  })

  if (!user) {
    notFound()
  }

  const script = await prisma.script.findFirst({
    where: {
      id: scriptId,
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
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black px-0 sm:px-8 py-4">
      <div className="container mx-auto max-w-[98%] sm:max-w-4xl py-0 sm:py-8">
        <ScriptCard
          script={{
            ...script,
            isVerified: false,
            isFavorited: false,
            owner: {
              ...script.owner,
              sponsorship: user.sponsorship,
            },
          }}
          isAuthenticated={!!session}
          currentUserId={session?.user?.id}
          truncate={false}
          searchQuery=""
        />
      </div>
    </main>
  )
}
