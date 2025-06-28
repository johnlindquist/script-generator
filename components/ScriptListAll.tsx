'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Prisma } from '@prisma/client'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import ScriptCard from './ScriptCard'
import VirtualScriptList from './VirtualScriptList'
import { Skeleton } from './ui/skeleton'

type ScriptWithRelations = Prisma.ScriptGetPayload<{
  include: {
    owner: {
      include: {
        sponsorship: true
      }
    }
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

export const LoadingListView = () => (
  <div className="flex gap-6 h-[600px] max-w-full">
    {/* Scrollable List Panel - Fixed width */}
    <div className="w-[360px] flex-shrink-0 overflow-y-auto rounded-lg border border-zinc-800">
      <div className="divide-y divide-zinc-800">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="p-4 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-4 mt-3">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Script Card Panel - Fill remaining width */}
    <div className="flex-1 min-w-0 h-full">
      <div className="h-full rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
        <div className="h-full flex flex-col gap-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="flex-1" />
          <div className="flex justify-between">
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)

interface ScriptListAllProps {
  initialData?: {
    scripts: ScriptWithRelations[]
    totalPages: number
    currentPage: number
  } | null
  isLoading?: boolean
}

const SCRIPTS_PER_PAGE = 30

export default function ScriptListAll({ initialData, isLoading = false }: ScriptListAllProps) {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const [scripts, setScripts] = useState<ScriptWithRelations[]>(initialData?.scripts || [])
  const [loading, setLoading] = useState(!initialData)
  const [error] = useState<string | null>(null)
  const [selectedScript, setSelectedScript] = useState<ScriptWithRelations | null>(
    initialData?.scripts?.[0] || null
  )
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [offset, setOffset] = useState(initialData?.scripts?.length || 0)

  useEffect(() => {
    // Update state when initial data changes
    if (initialData) {
      setScripts(initialData.scripts)
      if (initialData.scripts.length > 0 && !selectedScript) {
        setSelectedScript(initialData.scripts[0])
      }
      setLoading(false)
      setOffset(initialData.scripts.length)
      // Check if we have more scripts to load
      setHasMore(initialData.scripts.length >= SCRIPTS_PER_PAGE)
    }
  }, [initialData])

  useEffect(() => {
    // Update loading state
    setLoading(isLoading)
  }, [isLoading])

  const handleScriptDeleted = (scriptId: string) => {
    setScripts(prev => prev.filter(s => s.id !== scriptId))
    if (selectedScript?.id === scriptId) {
      setSelectedScript(scripts[0] || null)
    }
  }

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    try {
      const params = new URLSearchParams(searchParams?.toString() ?? '')
      params.set('limit', String(SCRIPTS_PER_PAGE))
      params.set('offset', String(offset))

      const res = await fetch(`/api/scripts?${params.toString()}`)
      if (!res.ok) {
        throw new Error('Failed to fetch more scripts')
      }

      const data = await res.json() as { scripts: ScriptWithRelations[] }
      if (data.scripts && data.scripts.length > 0) {
        const newScripts = data.scripts.map((script: ScriptWithRelations) => ({
          ...script,
          isVerified: false,
          isFavorited: false,
        }))

        setScripts(prev => [...prev, ...newScripts])
        setOffset(prev => prev + newScripts.length)

        // If we got less than requested, we've reached the end
        if (newScripts.length < SCRIPTS_PER_PAGE) {
          setHasMore(false)
        }
      } else {
        setHasMore(false)
      }
    } catch (err) {
      console.error('Failed to load more scripts:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, offset, searchParams])

  if (loading) {
    return <LoadingListView />
  }

  if (error) {
    return <div className="text-red-500 text-center py-4">Error: {error}</div>
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-300px)] min-h-[600px] max-w-full">
      {/* Virtual Scrollable List Panel - Fixed width */}
      <VirtualScriptList
        scripts={scripts}
        selectedScript={selectedScript}
        onScriptClick={setSelectedScript}
        onLoadMore={loadMore}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
      />

      {/* Script Card Panel - Fill remaining width */}
      <div className="flex-1 min-w-0 h-full">
        <div className="h-full rounded-lg border border-zinc-800 bg-zinc-900/30">
          {selectedScript ? (
            <ScriptCard
              script={selectedScript}
              isAuthenticated={!!session}
              currentUserId={session?.user?.id}
              onDeleted={handleScriptDeleted}
              truncate={false}
              searchQuery={searchParams?.get('query') ?? ''}
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
