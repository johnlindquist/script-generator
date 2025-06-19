'use client'

import React, { Fragment, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQueryState } from 'nuqs'
import { ListIcon, GridIcon } from '@/components/Icons'
import ScriptListClient from '@/components/ScriptListClient'
import ScriptListAll, { LoadingListView } from '@/components/ScriptListAll'
import ScriptListMobile from '@/components/ScriptListMobile'
import { ScriptsResponse } from '@/types/script'
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid'
import { SortMode, sortOptions } from '@/components/ScriptSort'
import ScriptSearch from './ScriptSearch'
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react'
import useSWR from 'swr'
import ScriptCardSkeleton from './ScriptCardSkeleton'

type ViewMode = 'grid' | 'list'

interface ViewToggleProps {
  initialData?: ScriptsResponse
}

export default function ViewToggle({ initialData }: ViewToggleProps = {}) {
  const { data: session } = useSession()
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

  // Update SWR to include query parameter and use initial data
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
      }),
    {
      fallbackData: initialData,
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  )

  // Fetch list view data (30 items initially) separately
  const { data: listViewData, isLoading: isLoadingList } = useSWR<ScriptsResponse>(
    view === 'list'
      ? `/api/scripts?${new URLSearchParams({
          sort,
          limit: '30',
          ...(query ? { query } : {}),
        }).toString()}`
      : null,
    (url: string) =>
      fetch(url).then(res => {
        if (!res.ok) throw new Error('Failed to fetch scripts')
        return res.json()
      }),
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
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

  // Prefetch list data when hovering over list button
  const handleListHover = () => {
    if (view !== 'list' && !listViewData && !isLoadingList) {
      // Trigger SWR to start fetching
      const url = `/api/scripts?${new URLSearchParams({
        sort,
        limit: '30',
        ...(query ? { query } : {}),
      }).toString()}`

      // Prefetch the data
      fetch(url)
        .then(res => res.json())
        .catch(() => {})
    }
  }

  const handleSortChange = async (newSort: SortMode) => {
    await setSort(newSort)
    await setPage('1') // Reset to first page when changing sort
  }

  console.log({ isClient, isLoading, scriptsData })

  // Create a loading grid of skeletons
  const LoadingGrid = () => (
    <div className="w-full grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <ScriptCardSkeleton key={index} />
      ))}
    </div>
  )

  // Create a loading list for mobile
  const LoadingMobileList = () => (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="p-4 border border-zinc-800 rounded-lg space-y-2">
          <div className="h-6 bg-zinc-800 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-zinc-800 rounded w-1/4 animate-pulse" />
          <div className="h-4 bg-zinc-800 rounded w-1/2 animate-pulse" />
        </div>
      ))}
    </div>
  )

  // Update loading state check for initial client-side render
  // Show skeletons only if we have no data at all (neither initial nor fetched)
  if (!isClient && !initialData) {
    return (
      <div id="scripts" className="min-h-[400px]">
        {view === 'grid' ? <LoadingGrid /> : <LoadingListView />}
      </div>
    )
  }

  // Mobile view
  if (isMobile) {
    return (
      <div className="h-[100dvh] flex flex-col">
        <div className="flex-none">
          <h2 className="sm:text-3xl text-2xl font-semibold text-center mb-4">Community Scripts</h2>
          <div className="space-y-3 mb-4 px-2">
            <ScriptSearch />
            <div className="py-1">
              <Menu as="div" className="relative flex-1">
                <MenuButton className="relative w-full cursor-pointer rounded-md bg-zinc-800 py-2 pl-3 pr-10 text-left text-sm text-gray-400 border border-zinc-700 hover:text-gray-300 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400">
                  <span className="block truncate">
                    {sortOptions.find(option => option.id === sort)?.name}
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </span>
                </MenuButton>
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
                    className="absolute z-50 mt-1 w-full origin-top-right rounded-md bg-zinc-800 py-1 text-sm shadow-lg border border-zinc-700 focus:outline-none"
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
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading || !scriptsData ? (
            <LoadingMobileList />
          ) : (
            <ScriptListMobile initialData={scriptsData} />
          )}
        </div>
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
                <MenuButton className="relative w-full cursor-pointer rounded-md bg-zinc-800 py-2 pl-3 pr-10 text-left text-sm text-gray-400 border border-zinc-700 hover:text-gray-300 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400">
                  <span className="block truncate">
                    {sortOptions.find(option => option.id === sort)?.name}
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </span>
                </MenuButton>
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
                  onMouseEnter={handleListHover}
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
      <div>
        {view === 'grid' ? (
          isLoading || !scriptsData ? (
            <LoadingGrid />
          ) : (
            <ScriptListClient
              isAuthenticated={!!session}
              currentUserId={session?.user?.id}
              initialData={scriptsData}
            />
          )
        ) : (
          <ScriptListAll initialData={listViewData} isLoading={isLoadingList} />
        )}
      </div>
    </div>
  )
}
