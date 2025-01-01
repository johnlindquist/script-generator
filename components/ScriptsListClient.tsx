'use client'

import { useState } from 'react'
import { ScriptWithRelations, ScriptsResponse } from '@/types/script'
import useSWR from 'swr'
import ScriptCard from './ScriptCard'
import { STRINGS } from '@/lib/strings'

interface ScriptListClientProps {
  isAuthenticated: boolean
  currentUserId?: string
  initialData: {
    scripts: ScriptWithRelations[]
    totalPages: number
    currentPage: number
  }
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ScriptsListClient({
  isAuthenticated,
  currentUserId,
  initialData,
}: ScriptListClientProps) {
  const [deletedScriptIds, setDeletedScriptIds] = useState<Set<string>>(new Set())

  const { data, mutate } = useSWR<ScriptsResponse>(
    `/api/scripts?page=${initialData.currentPage}`,
    fetcher,
    {
      fallbackData: {
        scripts: initialData.scripts,
        totalPages: initialData.totalPages,
        currentPage: initialData.currentPage,
      },
      revalidateOnFocus: false,
    }
  )

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
            href={`/scripts/mine?page=${Math.max(1, initialData.currentPage - 1)}`}
            className={`px-4 py-2 bg-amber-400/10 text-amber-300 rounded-lg hover:bg-amber-400/20 ${
              initialData.currentPage === 1 ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            {STRINGS.HOME.pagination.previous}
          </a>
          <span className="text-slate-300">
            {STRINGS.HOME.pagination.pageInfo
              .replace('{currentPage}', String(initialData.currentPage))
              .replace('{totalPages}', String(data?.totalPages || initialData.totalPages))}
          </span>
          <a
            href={`/scripts/mine?page=${Math.min(data?.totalPages || initialData.totalPages, initialData.currentPage + 1)}`}
            className={`px-4 py-2 bg-amber-400/10 text-amber-300 rounded-lg hover:bg-amber-400/20 ${
              initialData.currentPage === (data?.totalPages || initialData.totalPages)
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
