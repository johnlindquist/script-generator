import { getServerSession } from 'next-auth'
import { authOptions } from './api/auth/[...nextauth]/route'
import NavBar from '@/components/NavBar'
import ScriptGenerationClient from '@/components/ScriptGenerationClient'
import ScriptListClient from '@/components/ScriptListClient'
import { STRINGS } from '@/lib/strings'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getInitialScripts(page: number = 1) {
  const PAGE_SIZE = 12
  const [totalScripts, scripts] = await Promise.all([
    prisma.script.count({
      where: {
        status: 'ACTIVE',
        saved: true,
      },
    }),
    prisma.script.findMany({
      where: {
        status: 'ACTIVE',
        saved: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        content: true,
        saved: true,
        createdAt: true,
        dashedName: true,
        owner: {
          select: {
            username: true,
            id: true,
          },
        },
        _count: {
          select: {
            verifications: true,
            favorites: true,
            installs: true,
          },
        },
      },
    }),
  ])

  return {
    scripts: scripts.map(script => ({
      ...script,
      isVerified: false,
      isFavorited: false,
    })),
    totalPages: Math.ceil(totalScripts / PAGE_SIZE),
    currentPage: page,
  }
}

export default async function Home({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await getServerSession(authOptions)
  const params = await searchParams
  const page = Number(params.page ?? '1')
  const initialData = await getInitialScripts(page)

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black px-8 py-4">
      <NavBar isAuthenticated={!!session} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4 text-center">
          <p className="text-amber-400/80 text-sm">{STRINGS.HOME.prototype.warning}</p>
        </div>

        {/* Client-side script generation form */}
        <ScriptGenerationClient isAuthenticated={!!session} />

        <hr className="my-8 border-zinc-800" />

        {/* Community Scripts Header */}
        <h2 className="text-3xl font-bold text-gray-300 mb-8 mt-12 text-center">
          Community Scripts
        </h2>

        {/* Client-side script list with pagination */}
        <div className="mt-8">
          <ScriptListClient
            isAuthenticated={!!session}
            currentUserId={session?.user?.id}
            initialData={initialData}
          />
        </div>
      </div>
    </main>
  )
}
