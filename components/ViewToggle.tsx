'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { ListIcon, GridIcon } from '@/components/Icons'
import ScriptListClient from '@/components/ScriptListClient'
import ScriptListAll from '@/components/ScriptListAll'
import ScriptListMobile from '@/components/ScriptListMobile'
import { ScriptsResponse } from '@/types/script'
import ScriptSort, { SortMode } from '@/components/ScriptSort'

type ViewMode = 'grid' | 'list'

export default function ViewToggle() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const [view, setView] = useState<ViewMode>('grid')
  const [isClient, setIsClient] = useState(false)
  const [initialData, setInitialData] = useState<ScriptsResponse | null>(null)
  const [sort, setSort] = useState<SortMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('scriptSortMode') as SortMode) || 'createdAt'
    }
    return 'createdAt'
  })
  const [isMobile, setIsMobile] = useState(false)

  // Initialize from localStorage on mount and fetch initial data
  useEffect(() => {
    setIsClient(true)
    const savedView = localStorage.getItem('scriptViewMode') as ViewMode
    if (savedView) {
      setView(savedView)
    }

    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    // Fetch initial data
    const fetchInitialData = async () => {
      try {
        const params = new URLSearchParams(searchParams?.toString() ?? '')
        const res = await fetch(`/api/scripts?${params.toString()}`)
        if (!res.ok) throw new Error('Failed to fetch scripts')
        const data = await res.json()
        setInitialData(data)
      } catch (error) {
        console.error('Error fetching scripts:', error)
      }
    }
    fetchInitialData()

    return () => window.removeEventListener('resize', checkMobile)
  }, [searchParams])

  const handleViewChange = (newView: ViewMode) => {
    setView(newView)
    localStorage.setItem('scriptViewMode', newView)
  }

  // Avoid hydration mismatch
  if (!isClient || !initialData) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-amber-400" />
      </div>
    )
  }

  // Mobile view
  if (isMobile) {
    return (
      <div>
        <div className="px-4 mb-4">
          <ScriptSort sort={sort} setSort={setSort} />
        </div>
        <ScriptListMobile initialData={initialData} />
      </div>
    )
  }

  // Desktop view
  return (
    <div>
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-gray-300">Community Scripts</h2>
        <div className="flex items-center gap-4">
          <ScriptSort sort={sort} setSort={setSort} />

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">View:</span>
            <div className="flex">
              <button
                onClick={() => handleViewChange('grid')}
                className={`flex items-center gap-2 px-3 py-2 rounded-l-lg border border-zinc-700 ${
                  view === 'grid'
                    ? 'bg-zinc-800 text-amber-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <GridIcon />
                <span className="text-sm">Grid</span>
              </button>
              <button
                onClick={() => handleViewChange('list')}
                className={`flex items-center gap-2 px-3 py-2 rounded-r-lg border-t border-r border-b border-zinc-700 -ml-px ${
                  view === 'list'
                    ? 'bg-zinc-800 text-amber-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <ListIcon />
                <span className="text-sm">List</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scripts Display */}
      <div className={view === 'list' ? 'h-[600px]' : ''}>
        {view === 'grid' ? (
          <ScriptListClient
            isAuthenticated={!!session}
            currentUserId={session?.user?.id}
            initialData={initialData}
          />
        ) : (
          <ScriptListAll />
        )}
      </div>
    </div>
  )
}
