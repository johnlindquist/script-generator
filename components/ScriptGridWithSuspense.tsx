'use client'

import { useEffect } from 'react'
import useSWR from 'swr'
import { Suspense } from 'react'
import ScriptCard from './ScriptCard'
import ScriptCardSkeleton from './ScriptCardSkeleton'

interface Script {
  id: string
  title: string
  content: string
  saved: boolean
  createdAt: Date
  dashedName: string | null
  owner: {
    username: string
    id: string
  }
  _count: {
    verifications: number
    favorites: number
    installs: number
  }
  isVerified: boolean
  isFavorited: boolean
}

interface ScriptsResponse {
  scripts: Script[]
  totalPages: number
  currentPage: number
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface ScriptGridWithSuspenseProps {
  page: number
  isAuthenticated: boolean
  currentUserId?: string
  onPageOutOfRange: () => void
  onTotalPagesChange: (totalPages: number) => void
  fallbackData: ScriptsResponse
}

export default function ScriptGridWithSuspense({
  page,
  isAuthenticated,
  currentUserId,
  onPageOutOfRange,
  onTotalPagesChange,
  fallbackData,
}: ScriptGridWithSuspenseProps) {
  const { data, isLoading, mutate } = useSWR<ScriptsResponse>(
    `/api/scripts?page=${page}`,
    fetcher,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      suspense: true,
      fallbackData,
    }
  )

  // With suspense: true and fallbackData, data will always be defined
  if (!data) throw new Error('Should never happen with suspense: true and fallbackData')

  useEffect(() => {
    if (data.totalPages) {
      onTotalPagesChange(data.totalPages)
    }
  }, [data.totalPages, onTotalPagesChange])

  // This will only run after data is loaded due to suspense
  if (data.totalPages && page > data.totalPages) {
    onPageOutOfRange()
    return null
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {isLoading
        ? // Show skeletons during loading
          Array.from({ length: 6 }).map((_, i) => <ScriptCardSkeleton key={i} />)
        : // Show actual content when not loading
          data.scripts.map(script => (
            <Suspense key={script.id} fallback={<ScriptCardSkeleton />}>
              <ScriptCard
                script={script}
                isAuthenticated={isAuthenticated}
                currentUserId={currentUserId}
                onScriptChanged={() => mutate()}
              />
            </Suspense>
          ))}
    </div>
  )
}
