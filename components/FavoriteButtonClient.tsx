'use client'
import { useState } from 'react'
import { Tooltip } from '@nextui-org/react'
import { STRINGS } from '@/lib/strings'
import useSWR from 'swr'
import { useParams } from 'next/navigation'
import toast from 'react-hot-toast'

interface FavoriteButtonClientProps {
  scriptId: string
  initialIsFavorited: boolean
  initialFavoriteCount: number
  isAuthenticated: boolean
}

interface Script {
  id: string
  isFavorited: boolean
  _count: {
    favorites: number
  }
}

interface ScriptsResponse {
  scripts: Script[]
}

export default function FavoriteButtonClient({
  scriptId,
  initialIsFavorited,
  initialFavoriteCount,
  isAuthenticated,
}: FavoriteButtonClientProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const params = useParams()
  const username = params?.username as string | undefined

  // Use the same SWR key as the parent component
  const apiUrl = username ? `/${username}/api/scripts?page=1` : `/api/scripts?page=1`
  const { mutate } = useSWR(apiUrl)

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      toast.error(STRINGS.FAVORITE_BUTTON.signInRequired)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Optimistically update the UI
      mutate(
        async (currentData: ScriptsResponse | undefined) => {
          if (!currentData) return currentData

          const updatedScripts = currentData.scripts.map((script: Script) =>
            script.id === scriptId
              ? {
                  ...script,
                  isFavorited: !script.isFavorited,
                  _count: {
                    ...script._count,
                    favorites: script._count.favorites + (script.isFavorited ? -1 : 1),
                  },
                }
              : script
          )

          return { ...currentData, scripts: updatedScripts }
        },
        { revalidate: false }
      )

      const response = await fetch('/api/favorite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ scriptId }),
      })

      if (response.status === 401) {
        throw new Error(STRINGS.FAVORITE_BUTTON.signInRequired)
      }

      if (!response.ok) {
        throw new Error(STRINGS.FAVORITE_BUTTON.error)
      }

      const data = await response.json() as { isFavorited: boolean; favoriteCount: number }

      // Update with the real data from the server
      mutate(
        async (currentData: ScriptsResponse | undefined) => {
          if (!currentData) return currentData

          const updatedScripts = currentData.scripts.map((script: Script) =>
            script.id === scriptId
              ? {
                  ...script,
                  isFavorited: data.isFavorited,
                  _count: {
                    ...script._count,
                    favorites: data.favoriteCount,
                  },
                }
              : script
          )

          return { ...currentData, scripts: updatedScripts }
        },
        { revalidate: false }
      )
    } catch (error) {
      console.error('Error favoriting script:', error)
      setError(error instanceof Error ? error.message : STRINGS.FAVORITE_BUTTON.error)

      // Revert the optimistic update on error
      mutate()
    } finally {
      setIsLoading(false)
    }
  }

  // Get the current state from the SWR cache
  const currentScript = useSWR<ScriptsResponse>(apiUrl).data?.scripts?.find(
    (s: Script) => s.id === scriptId
  )
  const isFavorited = currentScript?.isFavorited ?? initialIsFavorited
  const favoriteCount = currentScript?._count?.favorites ?? initialFavoriteCount

  return (
    <Tooltip
      content={
        error ||
        (isFavorited ? STRINGS.FAVORITE_BUTTON.tooltipRemove : STRINGS.FAVORITE_BUTTON.tooltipAdd)
      }
    >
      <button
        onClick={handleFavorite}
        disabled={isLoading || !isAuthenticated}
        className={`inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg bg-primary/10 text-amber-300 hover:bg-primary/20 transition-colors disabled:opacity-50 min-w-[3.5rem] justify-center ${
          error ? 'border-red-500 border' : ''
        } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <svg
          className={`w-4 h-4 ${isFavorited ? 'text-amber-300' : ''} ${
            error ? 'text-red-500' : ''
          }`}
          fill={isFavorited ? 'currentColor' : 'none'}
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
        <span>{favoriteCount}</span>
      </button>
    </Tooltip>
  )
}
