'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useQueryState } from 'nuqs'
import { ListIcon, GridIcon } from '@/components/Icons'
import { Menu, MenuItem, MenuItems, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid'
import ScriptListClient from '@/components/ScriptListClient'
import ScriptListAll from '@/components/ScriptListAll'
import ScriptListMobile from '@/components/ScriptListMobile'
import { ScriptsResponse } from '@/types/script'
import ScriptSearch from './ScriptSearch'
import { Loader, Loader2 } from 'lucide-react'
import useSWR from 'swr'

type ViewMode = 'grid' | 'list'
type SortMode = 'alphabetical' | 'username' | 'favorites' | 'downloads' | 'verified' | 'createdAt'

const sortOptions = [
  { id: 'createdAt', name: 'Date Created' },
  { id: 'alphabetical', name: 'Title' },
  { id: 'username', name: 'Username' },
  { id: 'favorites', name: 'Favorites' },
  { id: 'downloads', name: 'Downloads' },
  { id: 'verified', name: 'Verifications' },
]

export default function ViewToggle() {
  const { data: session } = useSession()
  const router = useRouter()
  const [sort, setSort] = useQueryState('sort', {
    defaultValue: 'createdAt',
    parse: (value: string): SortMode => {
      return sortOptions.some(opt => opt.id === value) ? (value as SortMode) : 'createdAt'
    },
  })
  const [page, setPage] = useQueryState('page', {
    defaultValue: '1',
    parse: (value: string) => value,
  })
  const [view, setView] = useState<ViewMode>('grid')
  const [isClient, setIsClient] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [query] = useQueryState('query')

  // Update SWR to include query parameter
  const { data: scriptsData, isLoading } = useSWR<ScriptsResponse>(
    `/api/scripts?${new URLSearchParams({
      sort,
      page,
      ...(query ? { query } : {}),
    }).toString()}`,
    (url: string) =>
      fetch(url).then(res => {
        if (!res.ok) throw new Error('Failed to fetch scripts')
        return res.json()
      })
  )

  // Initialize from localStorage on mount
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

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleViewChange = (newView: ViewMode) => {
    setView(newView)
    localStorage.setItem('scriptViewMode', newView)
  }

  const handleSortChange = async (newSort: SortMode) => {
    await setSort(newSort)
    await setPage('1') // Reset to first page when changing sort
  }

  console.log({ isClient, isLoading, scriptsData })

  // Update loading state check
  if (!isClient) {
    return (
      <div id="scripts" className="min-h-[400px] flex justify-center items-center py-8">
        <Loader2 className="h-8 animate-spin w-8 text-muted-foreground" />
      </div>
    )
  }

  // Mobile view
  if (isMobile) {
    return (
      <div>
        <h2 className="sm:text-3xl text-2xl font-semibold text-center">Community Scripts</h2>
        {isLoading || !scriptsData ? (
          <Loader2 className="h-8 animate-spin w-8 text-muted-foreground" />
        ) : (
          <ScriptListMobile initialData={scriptsData} />
        )}
      </div>
    )
  }

  // Desktop view
  return (
    <div>
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex flex-col gap-3 w-full">
          <h2 className="text-2xl lg:text-3xl font-semibold mb-3">Community Scripts</h2>
          {/* Search Scripts */}
          <div className="w-full flex items-center gap-4 justify-center">
            <ScriptSearch />
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 flex-shrink-0">Sort By:</span>
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
                  <MenuItems
                    className="absolute z-50 origin-top-right rounded-md bg-zinc-800 py-1 text-sm shadow-lg border border-zinc-700 focus:outline-none w-[var(--button-width)]"
                    anchor={{ to: 'bottom end', gap: 4 }}
                  >
                    {sortOptions.map(option => (
                      <MenuItem key={option.id}>
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
                      </MenuItem>
                    ))}
                  </MenuItems>
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
      </div>

      {/* Scripts Display */}
      <div className={view === 'list' ? 'h-[600px]' : ''}>
        {isLoading || !scriptsData ? (
          <div className="flex justify-center items-center py-8 pb-48">
            <Loader2 className="h-8 animate-spin w-8 text-muted-foreground" />
          </div>
        ) : (
          <>
            {view === 'grid' ? (
              <ScriptListClient
                isAuthenticated={!!session}
                currentUserId={session?.user?.id}
                initialData={scriptsData}
              />
            ) : (
              <ScriptListAll />
            )}
          </>
        )}
      </div>
    </div>
  )
}
