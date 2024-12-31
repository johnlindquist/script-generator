'use client'
import { useState } from 'react'
import { Tooltip } from '@nextui-org/react'

interface FavoriteButtonClientProps {
  scriptId: string
  initialIsFavorited: boolean
  initialFavoriteCount: number
  isAuthenticated: boolean
}

export default function FavoriteButtonClient({
  scriptId,
  initialIsFavorited,
  initialFavoriteCount,
  isAuthenticated,
}: FavoriteButtonClientProps) {
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited)
  const [favoriteCount, setFavoriteCount] = useState(initialFavoriteCount)
  const [isLoading, setIsLoading] = useState(false)

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to favorite scripts')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/favorite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scriptId }),
      })

      if (!response.ok) {
        throw new Error('Failed to favorite script')
      }

      setIsFavorited(!isFavorited)
      setFavoriteCount(favoriteCount + (isFavorited ? -1 : 1))
    } catch (error) {
      console.error('Error favoriting script:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Tooltip content={isFavorited ? 'Remove from favorites' : 'Add to favorites'}>
      <button
        onClick={handleFavorite}
        disabled={isLoading}
        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 transition-colors disabled:opacity-50"
      >
        <svg
          className={`w-4 h-4 ${isFavorited ? 'text-amber-300' : ''}`}
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