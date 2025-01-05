'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { ListIcon, GridIcon } from '@/components/Icons'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid'
import ScriptListClient from '@/components/ScriptListClient'
import ScriptListAll from '@/components/ScriptListAll'
import ScriptListMobile from '@/components/ScriptListMobile'
import { ScriptsResponse } from '@/types/script'

type ViewMode = 'grid' | 'list'
type SortMode = 'alphabetical' | 'username' | 'favorites' | 'downloads' | 'verified'

const sortOptions = [
  { id: 'alphabetical', name: 'Alphabetical' },
  { id: 'username', name: 'Username' },
  { id: 'favorites', name: 'Favorites' },
  { id: 'downloads', name: 'Downloads' },
  { id: 'verified', name: 'Verifications' },
]

export default function ViewToggle() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const [view, setView] = useState<ViewMode>('grid')
  const [isClient, setIsClient] = useState(false)
  const [initialData, setInitialData] = useState<ScriptsResponse | null>(null)
  const [sort, setSort] = useState<SortMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('scriptSortMode') as SortMode) || 'alphabetical'
    }
    return 'alphabetical'
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

  const handleSortChange = (newSort: SortMode) => {
    setSort(newSort)
    localStorage.setItem('scriptSortMode', newSort)
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.set('sort', newSort)
    params.set('page', '1') // Reset to first page when changing sort
    window.location.href = `/?${params.toString()}`
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
    return <ScriptListMobile initialData={initialData} />
  }

  // Desktop view
  return (
    <div>
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-gray-300">Community Scripts</h2>
        <div className="flex items-center gap-4">
          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Sort By:</span>
            <Menu as="div" className="relative w-44">
              <Menu.Button className="relative w-full cursor-pointer rounded-md bg-zinc-800 py-2 pl-3 pr-10 text-left text-sm text-gray-400 border border-zinc-700 hover:text-gray-300 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400">
                <span className="block truncate">
                  {sortOptions.find(option => option.id === sort)?.name}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </span>
              </Menu.Button>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute z-50 origin-top-right rounded-md bg-zinc-800 py-1 text-sm shadow-lg border border-zinc-700 focus:outline-none">
                  {sortOptions.map(option => (
                    <Menu.Item key={option.id}>
                      {({ active }) => (
                        <button
                          onClick={() => handleSortChange(option.id as SortMode)}
                          className={`relative w-full text-left cursor-pointer select-none py-2 pl-10 pr-4 ${
                            active ? 'bg-zinc-700 text-amber-400' : 'text-gray-300'
                          } ${sort === option.id ? 'text-amber-400' : ''}`}
                        >
                          <span
                            className={`block truncate ${
                              sort === option.id ? 'font-medium' : 'font-normal'
                            }`}
                          >
                            {option.name}
                          </span>
                          {sort === option.id ? (
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-400">
                              <CheckIcon className="h-5 w-5" aria-hidden="true" />
                            </span>
                          ) : null}
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                </Menu.Items>
              </Transition>
            </Menu>
          </div>

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
