import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ScriptGridWithSuspense from '@/components/ScriptGridWithSuspense'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { ScriptLite, ScriptWithMinimalRelations } from '@/types/script'

const transformScript = (script: ScriptWithMinimalRelations): ScriptLite => ({
  ...script,
  isVerified: false,
  isFavorited: false,
})

export default async function UserScriptsPage({
  params,
  searchParams,
}: {
  params: { username: string }
  searchParams: { page?: string }
}) {
  const session = await getServerSession(authOptions)
  const { username } = params

  const user = await prisma.user.findFirst({
    where: { username },
  })

  if (!user) {
    notFound()
  }

  const page = Number(searchParams.page) || 1
  const pageSize = 12

  const scripts = await prisma.script.findMany({
    where: {
      ownerId: user.id,
      status: 'ACTIVE',
      saved: true,
    },
    orderBy: { createdAt: 'desc' },
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
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  const totalScripts = await prisma.script.count({
    where: {
      ownerId: user.id,
      status: 'ACTIVE',
      saved: true,
    },
  })

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black px-8 py-4">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-amber-300 mb-4">Scripts by {username}</h1>
        <ScriptGridWithSuspense
          scripts={scripts.map(transformScript)}
          isAuthenticated={!!session}
          currentUserId={session?.user?.id}
          page={page}
          totalPages={Math.ceil(totalScripts / pageSize)}
        />
      </div>
    </main>
  )
}
