'use client'

import { useEffect, useState } from 'react'
import type { Prisma } from '@prisma/client'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import ScriptCard from './ScriptCard'
import { StarIcon, ArrowDownTrayIcon, CheckBadgeIcon } from '@heroicons/react/24/outline'

type ScriptWithRelations = Prisma.ScriptGetPayload<{
  include: {
    owner: true
    _count: {
      select: {
        verifications: true
        favorites: true
        installs: true
      }
    }
  }
}> & {
  isVerified?: boolean
  isFavorited?: boolean
}

export default function ScriptListAll() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const [scripts, setScripts] = useState<ScriptWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedScript, setSelectedScript] = useState<ScriptWithRelations | null>(null)

  useEffect(() => {
    const fetchScripts = async () => {
      try {
        const params = new URLSearchParams(searchParams.toString())
        params.set('limit', '100')
        const res = await fetch(`/api/scripts?${params.toString()}`)
        if (!res.ok) {
          throw new Error('Failed to fetch scripts')
        }
        const data = await res.json()
        if (!data.scripts) {
          throw new Error('No scripts data received')
        }
        const transformedScripts = data.scripts.map((script: ScriptWithRelations) => ({
          ...script,
          isVerified: false,
          isFavorited: false,
        }))
        setScripts(transformedScripts)
        if (transformedScripts.length > 0) {
          setSelectedScript(transformedScripts[0])
        } else {
          setSelectedScript(null)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch scripts')
      } finally {
        setLoading(false)
      }
    }
    fetchScripts()
  }, [searchParams])

  const handleScriptDeleted = (scriptId: string) => {
    setScripts(prev => prev.filter(s => s.id !== scriptId))
    if (selectedScript?.id === scriptId) {
      setSelectedScript(scripts[0] || null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-amber-400" />
      </div>
    )
  }

  if (error) {
    return <div className="text-red-500 text-center py-4">Error: {error}</div>
  }

  return (
    <div className="flex gap-6 h-[600px] max-w-full">
      {/* Scrollable List Panel - Fixed width */}
      <div className="w-[360px] flex-shrink-0 overflow-y-auto rounded-lg border border-zinc-800">
        <ul className="divide-y divide-zinc-800">
          {scripts.map(script => (
            <li
              key={script.id}
              onClick={() => setSelectedScript(script)}
              className="relative border-l-2 border-transparent hover:bg-zinc-900/50 transition-colors cursor-pointer"
            >
              {/* Selection indicator - absolute positioned to avoid layout shifts */}
              {selectedScript?.id === script.id && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-400" />
              )}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-200 line-clamp-1">{script.title}</h3>
                <p className="text-sm text-amber-400 mt-1">
                  by {script.owner?.username || 'Anonymous'}
                </p>
                {script.summary && (
                  <p className="text-gray-400 mt-2 text-sm line-clamp-2">{script.summary}</p>
                )}
                {/* Stats Row */}
                <div className="flex gap-4 mt-3 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    <span>{script._count.installs}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <StarIcon className="h-4 w-4" />
                    <span>{script._count.favorites}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckBadgeIcon className="h-4 w-4" />
                    <span>{script._count.verifications}</span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Script Card Panel - Fill remaining width */}
      <div className="flex-1 min-w-0 h-full">
        <div className="h-full rounded-lg border border-zinc-800 bg-zinc-900/30">
          {selectedScript ? (
            <ScriptCard
              script={selectedScript}
              isAuthenticated={!!session}
              currentUserId={session?.user?.id}
              onDeleted={handleScriptDeleted}
              view="list"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              Select a script to view details
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
