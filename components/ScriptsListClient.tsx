'use client'

import { useState } from 'react'
import { STRINGS } from '@/lib/strings'
import ScriptCard from './ScriptCard'

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

interface ScriptsListClientProps {
  initialScripts: Script[]
  isAuthenticated: boolean
  currentUserId: string
  currentPage: number
  totalPages: number
}

export default function ScriptsListClient({
  initialScripts,
  isAuthenticated,
  currentUserId,
  currentPage,
  totalPages,
}: ScriptsListClientProps) {
  const [deletedScriptIds, setDeletedScriptIds] = useState<Set<string>>(new Set())

  const handleScriptDeleted = (scriptId: string) => {
    setDeletedScriptIds(prev => new Set([...prev, scriptId]))
  }

  const visibleScripts = initialScripts.filter(script => !deletedScriptIds.has(script.id))

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
    </>
  )
}
