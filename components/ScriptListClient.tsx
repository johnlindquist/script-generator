'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useCallback } from 'react'
import ScriptGridWithSuspense from './ScriptGridWithSuspense'

interface Script {
  id: string
  title: string
  content: string
  saved: boolean
  createdAt: Date
  dashedName: string | null
  owner: {
    username: string
    id: string
  }
  _count: {
    verifications: number
    favorites: number
    installs: number
  }
  isVerified: boolean
  isFavorited: boolean
}

interface ScriptsResponse {
  scripts: Script[]
  totalPages: number
  currentPage: number
}

interface ScriptListClientProps {
  isAuthenticated: boolean
  currentUserId?: string
  initialData: ScriptsResponse
}

export default function ScriptListClient({
  isAuthenticated,
  currentUserId,
  initialData,
}: ScriptListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const page = Number(searchParams.get('page') ?? '1')
  const [totalPages, setTotalPages] = useState(initialData.totalPages)

  const handlePageOutOfRange = useCallback(() => {
    router.replace('/?page=1')
  }, [router])

  const handleTotalPagesChange = useCallback((newTotalPages: number) => {
    setTotalPages(newTotalPages)
  }, [])

  return (
    <div>
      <ScriptGridWithSuspense
        page={page}
        isAuthenticated={isAuthenticated}
        currentUserId={currentUserId}
        onPageOutOfRange={handlePageOutOfRange}
        onTotalPagesChange={handleTotalPagesChange}
        fallbackData={initialData}
      />

      <div className="mt-8 flex justify-center gap-4">
        <button
          onClick={() => router.push(`/?page=${page - 1}`)}
          disabled={page <= 1}
          className="rounded bg-zinc-800 px-4 py-2 text-white disabled:opacity-50"
        >
          Previous
        </button>
        <span className="flex items-center text-slate-300">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => router.push(`/?page=${page + 1}`)}
          disabled={page >= totalPages}
          className="rounded bg-zinc-800 px-4 py-2 text-white disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}