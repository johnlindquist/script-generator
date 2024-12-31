import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import NavBar from '@/components/NavBar'
import ScriptsListClient from '@/components/ScriptsListClient'
import { redirect } from 'next/navigation'

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

        <ScriptsListClient
          initialScripts={transformedScripts}
          isAuthenticated={true}
          currentUserId={session.user.id}
          currentPage={currentPage}
          totalPages={totalPages}
        />
      </div>
    </main>
  )
}
