'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { ScriptLite } from '@/types/script'
import ScriptCard from './ScriptCard'
import ScriptCardSkeleton from './ScriptCardSkeleton'
import { useSearchParams } from 'next/navigation'

interface InfiniteScrollGridProps {
  initialScripts: ScriptLite[]
  isAuthenticated: boolean
  currentUserId?: string
  totalScripts?: number
}

const SCRIPTS_PER_PAGE = 18 // 6 rows of 3 on desktop

export default function InfiniteScrollGrid({
  initialScripts,
  isAuthenticated,
  currentUserId,
}: InfiniteScrollGridProps) {
  const searchParams = useSearchParams()
  const [scripts, setScripts] = useState<ScriptLite[]>(initialScripts)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialScripts.length >= SCRIPTS_PER_PAGE)
  const [offset, setOffset] = useState(initialScripts.length)
  const [deletedScriptIds, setDeletedScriptIds] = useState<Set<string>>(new Set())
  const loadingRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Reset when search params change
  useEffect(() => {
    setScripts(initialScripts)
    setOffset(initialScripts.length)
    setHasMore(initialScripts.length >= SCRIPTS_PER_PAGE)
    setDeletedScriptIds(new Set())
  }, [initialScripts])

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore || isLoadingMore) return

    loadingRef.current = true
    setIsLoadingMore(true)

    try {
      const params = new URLSearchParams(searchParams?.toString() ?? '')
      params.set('limit', String(SCRIPTS_PER_PAGE))
      params.set('offset', String(offset))

      const res = await fetch(`/api/scripts?${params.toString()}`)
      if (!res.ok) {
        throw new Error('Failed to fetch more scripts')
      }

      const data = await res.json() as { scripts: ScriptLite[] }
      if (data.scripts && data.scripts.length > 0) {
        setScripts(prev => [...prev, ...data.scripts])
        setOffset(prev => prev + data.scripts.length)

        // If we got less than requested, we've reached the end
        if (data.scripts.length < SCRIPTS_PER_PAGE) {
          setHasMore(false)
        }
      } else {
        setHasMore(false)
      }
    } catch (err) {
      console.error('Failed to load more scripts:', err)
      setHasMore(false)
    } finally {
      setIsLoadingMore(false)
      loadingRef.current = false
    }
  }, [hasMore, offset, searchParams, isLoadingMore])

  // Scroll detection for container
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      if (!hasMore || isLoadingMore) return

      const { scrollTop, scrollHeight, clientHeight } = container

      // Load more when user is 300px from the bottom
      if (scrollHeight - scrollTop - clientHeight < 300) {
        loadMore()
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [hasMore, isLoadingMore, loadMore])

  const handleScriptDeleted = (scriptId: string) => {
    setDeletedScriptIds(prev => new Set([...prev, scriptId]))
  }

  const visibleScripts = scripts.filter(script => !deletedScriptIds.has(script.id))

  if (!visibleScripts.length && !isLoadingMore) {
    return (
      <div className="h-[calc(100vh-300px)] min-h-[600px] flex items-center justify-center">
        <div className="text-center text-gray-400">No scripts found</div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-[calc(100vh-300px)] min-h-[600px] overflow-y-auto rounded-lg border border-zinc-800 p-6 scrollbar-thin scrollbar-track-zinc-900 scrollbar-thumb-zinc-700 hover:scrollbar-thumb-zinc-600"
    >
      <div className="w-full grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visibleScripts.map(script => (
          <ScriptCard
            key={script.id}
            script={{
              ...script,
              owner: {
                ...script.owner,
                sponsorship: script.owner?.sponsorship,
              },
            }}
            isAuthenticated={isAuthenticated}
            currentUserId={currentUserId}
            onDeleted={() => handleScriptDeleted(script.id)}
            truncate={true}
            searchQuery={searchParams?.get('query') ?? ''}
          />
        ))}
      </div>

      {/* Loading indicator */}
      {isLoadingMore && (
        <div className="w-full py-8">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400 bg-zinc-900/50 backdrop-blur-sm rounded-full py-3 px-6 mx-auto w-fit border border-zinc-800">
            <div className="animate-spin h-4 w-4 border-2 border-amber-400 border-t-transparent rounded-full" />
            Loading more scripts...
          </div>
        </div>
      )}

      {/* Show skeleton cards while loading */}
      {isLoadingMore && (
        <div className="w-full grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 mt-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <ScriptCardSkeleton key={`skeleton-${index}`} />
          ))}
        </div>
      )}

      {/* End of results message */}
      {!hasMore && visibleScripts.length > 0 && (
        <div className="text-center text-gray-400 py-8">
          <p>You've reached the end! {visibleScripts.length} scripts loaded.</p>
        </div>
      )}
    </div>
  )
}
