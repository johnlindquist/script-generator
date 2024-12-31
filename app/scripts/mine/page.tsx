import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import NavBar from '@/components/NavBar'
import ScriptCard from '@/components/ScriptCard'
import { redirect } from 'next/navigation'
import { STRINGS } from '@/lib/strings'

export const dynamic = 'force-dynamic'

export default async function MyScriptsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/')
  }

  const { page: pageStr = '1' } = searchParams
  const currentPage = Math.max(1, Number(pageStr))
  const PAGE_SIZE = 12

  // Get total count first
  const totalScripts = await prisma.script.count({
    where: {
      status: 'ACTIVE',
      saved: true,
      ownerId: session.user.id,
    },
  })

  const totalPages = Math.ceil(totalScripts / PAGE_SIZE)

  // Redirect to page 1 if the requested page is beyond totalPages
  if (totalScripts > 0 && currentPage > totalPages) {
    redirect('/scripts/mine?page=1')
  }

  // If no scripts, return early with empty array
  if (totalScripts === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black px-8 py-4">
        <NavBar isAuthenticated={true} />
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-amber-300 mb-8">My Scripts</h1>
          <p className="text-center text-slate-300">You haven't created any scripts yet.</p>
        </div>
      </main>
    )
  }

  // Server-side fetch of scripts
  const scripts = await prisma.script.findMany({
    where: {
      status: 'ACTIVE',
      saved: true,
      ownerId: session.user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      owner: true,
      _count: {
        select: {
          verifications: true,
          favorites: true,
        },
      },
      verifications: {
        where: {
          userId: session.user.id,
        },
      },
      favorites: {
        where: {
          userId: session.user.id,
        },
      },
    },
  })

  // Transform scripts to include isVerified and match ScriptCard interface
  const transformedScripts = scripts.map(script => {
    const { owner, _count, verifications, favorites, ...rest } = script
    return {
      ...rest,
      owner: {
        username: owner.username,
        id: owner.id,
      },
      _count: {
        verifications: _count.verifications,
        favorites: _count.favorites,
        installs: 0,
      },
      isVerified: verifications.length > 0,
      isFavorited: favorites.length > 0,
    }
  })

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black px-8 py-4">
      <NavBar isAuthenticated={true} />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-amber-300 mb-8">My Scripts</h1>

        {/* Server-rendered scripts list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {transformedScripts.map(script => (
            <ScriptCard
              key={script.id}
              script={script}
              isAuthenticated={true}
              currentUserId={session.user.id}
            />
          ))}
        </div>

        {/* Pagination Controls */}
        {transformedScripts.length > 0 && (
          <div className="mt-8 flex justify-center items-center gap-4">
            <a
              href={`/scripts/mine?page=${Math.max(1, currentPage - 1)}`}
              className={`px-4 py-2 bg-amber-400/10 text-amber-300 rounded-lg hover:bg-amber-400/20 ${
                currentPage === 1 ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              {STRINGS.HOME.pagination.previous}
            </a>
            <span className="text-slate-300">
              {STRINGS.HOME.pagination.pageInfo
                .replace('{currentPage}', String(currentPage))
                .replace('{totalPages}', String(totalPages))}
            </span>
            <a
              href={`/scripts/mine?page=${Math.min(totalPages, currentPage + 1)}`}
              className={`px-4 py-2 bg-amber-400/10 text-amber-300 rounded-lg hover:bg-amber-400/20 ${
                currentPage === totalPages ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              {STRINGS.HOME.pagination.next}
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
