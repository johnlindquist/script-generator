'use client'

import { useState } from 'react'
import { ScriptLite, ScriptWithMinimalRelations, ScriptsResponse } from '@/types/script'
import useSWR from 'swr'
import ScriptCard from './ScriptCard'
import { STRINGS } from '@/lib/strings'
import { Session } from 'next-auth'
import { useSession } from 'next-auth/react'

interface ScriptListClientProps {
  isAuthenticated: boolean
  currentUserId?: string
  initialData: ScriptsResponse
}

const transformScript = (
  script: ScriptWithMinimalRelations,
  session: Session | null
): ScriptLite => {
  return {
    ...script,
    isVerified:
      'verifications' in script && Array.isArray(script.verifications)
        ? script.verifications.some((v: { userId: string }) => v.userId === session?.user?.id)
        : false,
    isFavorited:
      'favorites' in script && Array.isArray(script.favorites)
        ? script.favorites.some((f: { userId: string }) => f.userId === session?.user?.id)
        : false,
  }
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  const { data: session } = useSession()
  return {
    ...data,
    scripts: data.scripts.map((script: ScriptWithMinimalRelations) =>
      transformScript(script, session)
    ),
  }
}

export default function ScriptsListClient({
  isAuthenticated,
  currentUserId,
  initialData,
}: ScriptListClientProps) {
  const [deletedScriptIds, setDeletedScriptIds] = useState<Set<string>>(new Set())
  const { data: session } = useSession()

  const { data, mutate } = useSWR<ScriptsResponse>(
    `/api/scripts?page=${initialData.currentPage}`,
    fetcher,
    {
      fallbackData: {
        ...initialData,
        scripts: initialData.scripts.map(script => transformScript(script, session)),
      },
      revalidateOnFocus: false,
    }
  )

  const handleScriptDeleted = (scriptId: string) => {
    setDeletedScriptIds(prev => new Set([...prev, scriptId]))
  }

  const visibleScripts = (data?.scripts || []).filter(script => !deletedScriptIds.has(script.id))

  const sortedScripts = visibleScripts.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedScripts.map(script => (
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
            href={`/${session?.user?.username}?page=${Math.max(1, initialData.currentPage - 1)}`}
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
            href={`/${session?.user?.username}?page=${Math.min(data?.totalPages || initialData.totalPages, initialData.currentPage + 1)}`}
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
