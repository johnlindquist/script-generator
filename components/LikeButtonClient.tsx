'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { HandThumbUpIcon as HandThumbUpIconSolid } from '@heroicons/react/24/solid'
import { HandThumbUpIcon as HandThumbUpIconOutline } from '@heroicons/react/24/outline'

interface LikeButtonProps {
  scriptId: string
  initialIsLiked: boolean
  initialLikeCount: number
  isAuthenticated: boolean
}

export default function LikeButtonClient({
  scriptId,
  initialIsLiked,
  initialLikeCount,
  isAuthenticated,
}: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [isTogglingLike, setIsTogglingLike] = useState(false)

  const handleToggleLike = async () => {
    if (!isAuthenticated) {
      signIn()
      return
    }

    setIsTogglingLike(true)
    try {
      const response = await fetch('/api/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId }),
      })
      if (!response.ok) {
        throw new Error('Failed to like script')
      }
      const data = await response.json()
      setIsLiked(data.isLiked)
      setLikeCount(data.likeCount)
    } catch (error) {
      console.error('Like error:', error)
      alert('Failed to toggle like')
    } finally {
      setIsTogglingLike(false)
    }
  }

  return (
    <button
      onClick={handleToggleLike}
      disabled={isTogglingLike}
      className="text-slate-400 hover:text-amber-300 transition-colors group relative flex items-center h-5"
      title={isLiked ? 'Unlike script' : 'Like script'}
    >
      {isLiked ? (
        <HandThumbUpIconSolid className={`w-5 h-5 ${isTogglingLike ? 'animate-pulse' : ''}`} />
      ) : (
        <HandThumbUpIconOutline className={`w-5 h-5 ${isTogglingLike ? 'animate-pulse' : ''}`} />
      )}
      <span className="ml-1">{likeCount}</span>
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-sm text-slate-200 opacity-0 transition before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-black before:content-[''] group-hover:opacity-100">
        {isLiked ? 'Unlike script' : 'Like script'}
      </span>
    </button>
  )
}
