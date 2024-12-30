import { getServerSession } from 'next-auth'
import { authOptions } from './api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import NavBar from '@/components/NavBar'
import ScriptGenerationClient from '@/components/ScriptGenerationClient'
import ScriptCard from '@/components/ScriptCard'
import SignInButton from '@/components/SignInButton'

// Define types
export interface Script {
  id: string
  title: string
  content: string
  starred: boolean
  saved: boolean
  createdAt: Date
  dashedName?: string
  uppercaseName?: string
  owner: {
    id: string
    username: string
  }
  _count?: {
    likes: number
  }
  isLiked?: boolean
}

export default async function Home({
  searchParams,
}: {
  searchParams: { page?: string; pageSize?: string }
}) {
  const session = await getServerSession(authOptions)
  const page = Number(searchParams.page) || 1
  const pageSize = Number(searchParams.pageSize) || 9

  // Server-side fetch of scripts
  const scripts = await prisma.script.findMany({
    where: {
      saved: true,
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: 'desc' },
    include: {
      owner: true,
      _count: {
        select: { likes: true },
      },
      likes: session?.user?.id
        ? {
            where: { userId: session.user.id },
          }
        : false,
    },
  })

  // Transform scripts to include isLiked
  const transformedScripts = scripts.map(script => ({
    ...script,
    isLiked: script.likes ? script.likes.length > 0 : false,
    likes: undefined, // Remove the likes array from the response
  }))

  // Get total count for pagination
  const totalScripts = await prisma.script.count({
    where: {
      saved: true,
    },
  })

  const totalPages = Math.ceil(totalScripts / pageSize)

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black px-8 py-4">
      <NavBar isAuthenticated={!!session} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-12 text-center">
          {!session && (
            <p className="text-slate-300 mb-8">
              Browse existing scripts below or <SignInButton /> to generate your own!
            </p>
          )}
          <p className="text-amber-400/80 text-sm">
            ⚠️ This is a prototype - Don't expect scripts to work perfectly and backup your
            favorites!
          </p>
        </div>

        {/* Client-side script generation form */}
        <ScriptGenerationClient isAuthenticated={!!session} userId={session?.user?.id} />

        {/* Server-rendered scripts list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {transformedScripts.map(script => (
            <ScriptCard
              key={script.id}
              script={script}
              isAuthenticated={!!session}
              currentUserId={session?.user?.id}
            />
          ))}
        </div>

        {/* Pagination Controls */}
        {transformedScripts.length > 0 && (
          <div className="mt-8 flex justify-center items-center gap-4">
            <a
              href={`/?page=${Math.max(1, page - 1)}&pageSize=${pageSize}`}
              className={`px-4 py-2 bg-amber-400/10 text-amber-300 rounded-lg hover:bg-amber-400/20 ${
                page === 1 ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              Previous
            </a>
            <span className="text-slate-300">
              Page {page} of {totalPages}
            </span>
            <a
              href={`/?page=${Math.min(totalPages, page + 1)}&pageSize=${pageSize}`}
              className={`px-4 py-2 bg-amber-400/10 text-amber-300 rounded-lg hover:bg-amber-400/20 ${
                page === totalPages ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              Next
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
