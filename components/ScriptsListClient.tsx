'use client'

import { useState } from 'react'
import { STRINGS } from '@/lib/strings'
import ScriptCard from './ScriptCard'
import useSWR from 'swr'

interface Script {
  id: string
  title: string
  content: string
  saved: boolean
  createdAt: Date
  dashedName?: string | null
  owner: {
    username: string
    id: string
  }
  _count?: {
    verifications: number
    favorites: number
    installs: number
  }
  isVerified?: boolean
  isFavorited?: boolean
}

interface ScriptsResponse {
  scripts: Script[]
  totalPages: number
  currentPage: number
}

interface ScriptsListClientProps {
  initialScripts: Script[]
  isAuthenticated: boolean
  currentUserId: string
  currentPage: number
  totalPages: number
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ScriptsListClient({
  initialScripts,
  isAuthenticated,
  currentUserId,
  currentPage,
  totalPages: initialTotalPages,
}: ScriptsListClientProps) {
  const [deletedScriptIds, setDeletedScriptIds] = useState<Set<string>>(new Set())

  const { data, mutate } = useSWR<ScriptsResponse>(`/api/scripts?page=${currentPage}`, fetcher, {
    fallbackData: {
      scripts: initialScripts,
      totalPages: initialTotalPages,
      currentPage,
    },
    revalidateOnFocus: false,
  })

  const handleScriptDeleted = (scriptId: string) => {
    setDeletedScriptIds(prev => new Set([...prev, scriptId]))
  }

  const visibleScripts = (data?.scripts || []).filter(script => !deletedScriptIds.has(script.id))

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleScripts.map(script => (
          <ScriptCard
            key={script.id}
            script={script}
            isAuthenticated={isAuthenticated}
            currentUserId={currentUserId}
            onDeleted={() => handleScriptDeleted(script.id)}
            onScriptChanged={() => mutate()}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {visibleScripts.length > 0 && (
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
              .replace('{totalPages}', String(data?.totalPages || initialTotalPages))}
          </span>
          <a
            href={`/scripts/mine?page=${Math.min(data?.totalPages || initialTotalPages, currentPage + 1)}`}
            className={`px-4 py-2 bg-amber-400/10 text-amber-300 rounded-lg hover:bg-amber-400/20 ${
              currentPage === (data?.totalPages || initialTotalPages)
                ? 'pointer-events-none opacity-50'
                : ''
            }`}
          >
            {STRINGS.HOME.pagination.next}
          </a>
        </div>
      )}
    </>
  )
}
