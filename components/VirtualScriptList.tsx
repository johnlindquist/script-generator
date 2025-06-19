'use client'

import { useRef, useCallback, memo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Prisma } from '@prisma/client'
import { StarIcon, ArrowDownTrayIcon, CheckBadgeIcon } from '@heroicons/react/24/outline'

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

interface VirtualScriptListProps {
  scripts: ScriptWithRelations[]
  selectedScript: ScriptWithRelations | null
  onScriptClick: (script: ScriptWithRelations) => void
  onLoadMore?: () => void
  hasMore?: boolean
  isLoadingMore?: boolean
}

const VirtualScriptList = memo(function VirtualScriptList({
  scripts,
  selectedScript,
  onScriptClick,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
}: VirtualScriptListProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const lastScrollTop = useRef(0)

  // Estimated height for each script item in the list
  // Measured from original implementation: 116px per item
  const estimateSize = useCallback(() => 116, [])

  const virtualizer = useVirtualizer({
    count: scripts.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: 5, // Render 5 items outside of the visible area
  })

  // Handle scroll events for infinite loading
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const element = e.currentTarget
      const { scrollTop, scrollHeight, clientHeight } = element

      // Only trigger if scrolling down
      if (scrollTop > lastScrollTop.current) {
        // Check if we're near the bottom (within 200px)
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight

        if (distanceFromBottom < 200 && hasMore && !isLoadingMore && onLoadMore) {
          onLoadMore()
        }
      }

      lastScrollTop.current = scrollTop
    },
    [hasMore, isLoadingMore, onLoadMore]
  )

  return (
    <div
      ref={parentRef}
      className="w-[360px] flex-shrink-0 overflow-y-auto rounded-lg border border-zinc-800 h-full"
      onScroll={handleScroll}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map(virtualItem => {
          const script = scripts[virtualItem.index]
          const isSelected = selectedScript?.id === script.id

          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div
                onClick={() => onScriptClick(script)}
                className={`relative h-full border-l-2 ${
                  isSelected ? 'border-primary bg-zinc-900/70' : 'border-transparent'
                } hover:bg-zinc-900/50 transition-colors cursor-pointer border-b border-zinc-800`}
              >
                {/* Selection indicator */}
                {isSelected && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />}

                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-200 line-clamp-1">
                    {script.title}
                  </h3>
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
              </div>
            </div>
          )
        })}

        {/* Loading indicator */}
        {isLoadingMore && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              padding: '16px',
              textAlign: 'center',
              background:
                'linear-gradient(to top, rgb(24, 24, 27) 0%, rgb(24, 24, 27) 80%, transparent 100%)',
            }}
            className="border-t border-zinc-800"
          >
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400 bg-zinc-900 rounded-full py-2 px-4 mx-auto w-fit">
              <div className="animate-spin h-4 w-4 border-2 border-amber-400 border-t-transparent rounded-full" />
              Loading more scripts...
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

export default VirtualScriptList
