'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline'

interface FavoriteButtonProps {
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
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited)
  const [favoriteCount, setFavoriteCount] = useState(initialFavoriteCount)
  const [isToggling, setIsToggling] = useState(false)

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      signIn()
      return
    }

    setIsToggling(true)
    try {
      const response = await fetch('/api/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId }),
      })
      if (!response.ok) {
        throw new Error('Failed to favorite script')
      }
      const data = await response.json()
      setIsFavorited(data.isFavorited)
      setFavoriteCount(data.favoriteCount)
    } catch (error) {
      console.error('Favorite error:', error)
      alert('Failed to toggle favorite')
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={isToggling}
      className="text-slate-400 hover:text-amber-300 transition-colors group relative flex items-center h-5"
      title={isFavorited ? 'Unfavorite script' : 'Favorite script'}
    >
      {isFavorited ? (
        <StarIconSolid className={`w-5 h-5 ${isToggling ? 'animate-pulse' : ''}`} />
      ) : (
        <StarIconOutline className={`w-5 h-5 ${isToggling ? 'animate-pulse' : ''}`} />
      )}
      <span className="ml-1">{favoriteCount}</span>
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-sm text-slate-200 opacity-0 transition before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-black before:content-[''] group-hover:opacity-100">
        {isFavorited ? 'Unfavorite script' : 'Favorite script'}
      </span>
    </button>
  )
}
