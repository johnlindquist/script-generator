'use client'

import { useState } from 'react'
import { ScriptWithRelations } from '@/types/script'
import useSWR from 'swr'
import ScriptCard from './ScriptCard'
import { useParams } from 'next/navigation'

interface ScriptGridWithSuspenseProps {
  scripts: ScriptWithRelations[]
  isAuthenticated: boolean
  currentUserId?: string
  page: number
  totalPages: number
  onPageOutOfRange: () => void
  onTotalPagesChange?: (newTotalPages: number) => void
  fallbackData?: ScriptsResponse
}

interface ScriptsResponse {
  scripts: ScriptWithRelations[]
  totalPages: number
  currentPage: number
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ScriptGridWithSuspense({
  scripts: initialScripts,
  isAuthenticated,
  currentUserId,
  page,
  totalPages,
}: ScriptGridWithSuspenseProps) {
  const params = useParams()
  const username = params?.username as string | undefined
  const [deletedScriptIds, setDeletedScriptIds] = useState<Set<string>>(new Set())

  // Use different API endpoints based on whether we're on a user page or homepage
  const apiUrl = username ? `/${username}/api/scripts?page=${page}` : `/api/scripts?page=${page}`

  const { data } = useSWR<ScriptsResponse>(apiUrl, fetcher, {
    fallbackData: {
      scripts: initialScripts || [],
      totalPages,
      currentPage: page,
    },
    revalidateOnFocus: false,
  })

  const handleScriptDeleted = (scriptId: string) => {
    setDeletedScriptIds(prev => new Set([...prev, scriptId]))
  }

  // Ensure we have an array even if data is undefined
  const scripts = data?.scripts || initialScripts || []
  const visibleScripts = scripts.filter(
    (script: ScriptWithRelations) => !deletedScriptIds.has(script.id)
  )

  if (!scripts.length) {
    return <div className="text-center text-gray-400 py-12">No scripts found</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {visibleScripts.map((script: ScriptWithRelations) => (
        <ScriptCard
          key={script.id}
          script={script}
          isAuthenticated={isAuthenticated}
          currentUserId={currentUserId}
          onDeleted={() => handleScriptDeleted(script.id)}
          onScriptChanged={() => {
            // Refresh data
            window.location.reload()
          }}
        />
      ))}
    </div>
  )
}
