'use client'

import { useState } from 'react'
import { ScriptLite } from '@/types/script'
import useSWR from 'swr'
import ScriptCard from './ScriptCard'
import { useParams, useSearchParams } from 'next/navigation'

interface ScriptGridWithSuspenseProps {
  scripts: ScriptLite[]
  isAuthenticated: boolean
  currentUserId?: string
  page: number
  totalPages: number
  fallbackData?: ScriptsResponse
}

interface ScriptsResponse {
  scripts: ScriptLite[]
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
  fallbackData,
}: ScriptGridWithSuspenseProps) {
  const params = useParams()
  const searchParams = useSearchParams()
  const username = params?.username as string | undefined
  const [deletedScriptIds, setDeletedScriptIds] = useState<Set<string>>(new Set())

  // Construct the API URL with all search parameters
  const apiUrl = (() => {
    const baseUrl = username ? `/${username}/api/scripts` : '/api/scripts'
    const urlParams = new URLSearchParams(searchParams.toString())
    return `${baseUrl}?${urlParams.toString()}`
  })()

  const { data, mutate } = useSWR<ScriptsResponse>(apiUrl, fetcher, {
    fallbackData: fallbackData || {
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
  const visibleScripts = scripts.filter((script: ScriptLite) => !deletedScriptIds.has(script.id))

  if (!scripts.length) {
    return <div className="text-center text-gray-400 py-12">No scripts found</div>
  }

  return (
    <div className="w-full grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
      {visibleScripts.map((script: ScriptLite) => (
        <ScriptCard
          key={script.id}
          script={script}
          isAuthenticated={isAuthenticated}
          currentUserId={currentUserId}
          onDeleted={() => handleScriptDeleted(script.id)}
          onScriptChanged={() => {
            // Just trigger a revalidation instead of a full page reload
            mutate()
          }}
        />
      ))}
    </div>
  )
}
