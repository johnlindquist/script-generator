'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Highlight, themes } from 'prism-react-renderer'
import {
  ClipboardIcon,
  PencilSquareIcon,
  TrashIcon,
  StarIcon as StarIconSolid,
  HeartIcon as HeartIconSolid,
  XMarkIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/solid'
import {
  StarIcon as StarIconOutline,
  HeartIcon as HeartIconOutline,
} from '@heroicons/react/24/outline'

interface ScriptCardProps {
  script: {
    id: string
    title: string
    content: string
    starred: boolean
    saved: boolean
    createdAt: Date
    dashedName?: string
    owner: {
      username: string
      id: string
    }
    _count?: {
      likes: number
    }
    isLiked?: boolean
  }
  isAuthenticated: boolean
  currentUserId?: string
}

export default function ScriptCard({ script, isAuthenticated, currentUserId }: ScriptCardProps) {
  const router = useRouter()
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://scriptkit.com'
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isTogglingStar, setIsTogglingStar] = useState(false)
  const [isStarred, setIsStarred] = useState(script.starred)
  const [isLiked, setIsLiked] = useState(script.isLiked ?? false)
  const [likeCount, setLikeCount] = useState(script._count?.likes ?? 0)
  const [isTogglingLike, setIsTogglingLike] = useState(false)

  const handleStar = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to star scripts.')
      return
    }

    setIsTogglingStar(true)
    try {
      const response = await fetch('/api/star', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId: script.id }),
      })
      if (!response.ok) {
        throw new Error('Failed to star script')
      }
      const data = await response.json()
      setIsStarred(data.script.starred)
    } catch (error) {
      console.error('Star error:', error)
      alert('Failed to toggle star')
    } finally {
      setIsTogglingStar(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(script.content)
  }

  const handleEdit = () => {
    router.push(`/scripts/${script.id}`)
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/scripts/${script.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete script')
      }

      // Emit a custom event that the parent page can listen to
      const event = new CustomEvent('scriptDeleted', {
        detail: { scriptId: script.id },
      })
      window.dispatchEvent(event)

      router.refresh()
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete script')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const initiateDelete = () => {
    setShowDeleteConfirm(true)
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
  }

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
        body: JSON.stringify({ scriptId: script.id }),
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

  const isOwner = currentUserId === script.owner.id

  console.log('ScriptCard Debug Info:', {
    currentUserId,
    ownerId: script.owner.id,
    ownerUsername: script.owner.username,
    isOwner,
    scriptId: script.id,
  })

  return (
    <div
      className="border border-neutral-700 rounded-lg px-6 py-4 shadow-2xl flex flex-col h-[500px] break-inside hover:border-amber-400/20 transition-colors bg-zinc-900/90"
      data-script-id={script.id}
    >
      <div className="mb-4">
        <Link href={`/scripts/${script.id}`} className="block hover:opacity-75 transition-opacity">
          <h2 className="text-xl font-lexend font-semibold mb-2 text-amber-300">{script.title}</h2>
          <p className="text-slate-400 text-sm">
            by {script.owner.username} • {new Date(script.createdAt).toLocaleDateString()}
            {!isOwner && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-400/10 text-amber-300">
                <svg className="w-4 h-4 mr-1" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                {script.owner.username}
              </span>
            )}
          </p>
        </Link>
      </div>
      <div className="flex-grow flex flex-col overflow-hidden">
        <Link href={`/scripts/${script.id}`} className="block flex-grow min-h-0">
          <div className="bg-neutral-800/50 rounded-lg h-full border border-amber-400/10 hover:border-amber-400/20 transition-colors">
            <Highlight theme={themes.nightOwl} code={script.content} language="typescript">
              {({ className, style, tokens, getLineProps, getTokenProps }) => (
                <pre
                  className={`${className} p-4 h-full overflow-y-auto`}
                  style={{
                    ...style,
                    margin: 0,
                    background: 'transparent',
                  }}
                >
                  {tokens.map((line, i) => (
                    <div key={i} {...getLineProps({ line })} className="whitespace-pre break-all">
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </div>
                  ))}
                </pre>
              )}
            </Highlight>
          </div>
        </Link>
      </div>
      <div className="flex justify-between items-center mt-6 pt-5 border-t border-neutral-700">
        <div className="flex gap-2">
          {isOwner && (
            <>
              <button
                onClick={handleCopy}
                className="text-slate-400 hover:text-amber-300 transition-colors group relative flex items-center h-5"
                title="Copy script"
              >
                <ClipboardIcon className="w-5 h-5" />
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-sm text-slate-200 opacity-0 transition before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-black before:content-[''] group-hover:opacity-100">
                  Copy to clipboard
                </span>
              </button>
              <button
                onClick={handleEdit}
                className="text-slate-400 hover:text-amber-300 transition-colors group relative flex items-center h-5"
                title="Edit script"
              >
                <PencilSquareIcon className="w-5 h-5" />
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-sm text-slate-200 opacity-0 transition before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-black before:content-[''] group-hover:opacity-100">
                  Edit script
                </span>
              </button>
              <button
                onClick={showDeleteConfirm ? handleDelete : initiateDelete}
                className="text-slate-400 hover:text-amber-300 transition-colors group relative flex items-center h-5"
                disabled={isDeleting}
                title={showDeleteConfirm ? 'Confirm delete' : 'Delete script'}
              >
                {isDeleting ? (
                  <XMarkIcon className="w-5 h-5 animate-spin" />
                ) : (
                  <TrashIcon className="w-5 h-5" />
                )}
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-sm text-slate-200 opacity-0 transition before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-black before:content-[''] group-hover:opacity-100">
                  {showDeleteConfirm ? 'Click again to confirm delete' : 'Delete script'}
                </span>
              </button>
              {showDeleteConfirm && (
                <button
                  onClick={cancelDelete}
                  className="text-slate-400 hover:text-amber-300 transition-colors group relative flex items-center h-5"
                  title="Cancel delete"
                >
                  <XMarkIcon className="w-5 h-5" />
                  <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-sm text-slate-200 opacity-0 transition before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-black before:content-[''] group-hover:opacity-100">
                    Cancel delete
                  </span>
                </button>
              )}
            </>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleStar}
            className="text-slate-400 hover:text-amber-300 transition-colors group relative flex items-center h-5"
            disabled={isTogglingStar}
          >
            {isTogglingStar ? (
              <XMarkIcon className="w-5 h-5 animate-spin" />
            ) : isStarred ? (
              <StarIconSolid className="w-5 h-5" />
            ) : (
              <StarIconOutline className="w-5 h-5" />
            )}
            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-sm text-slate-200 opacity-0 transition before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-black before:content-[''] group-hover:opacity-100">
              {isStarred ? 'Remove from starred' : 'Add to starred'}
            </span>
          </button>
          <button
            onClick={handleToggleLike}
            className={`text-slate-400 hover:text-amber-300 transition-colors group relative flex items-center h-5 ${isLiked ? 'text-amber-300' : ''}`}
            disabled={isTogglingLike}
          >
            {isTogglingLike ? (
              <XMarkIcon className="w-5 h-5 animate-spin" />
            ) : isLiked ? (
              <HeartIconSolid className="w-5 h-5" />
            ) : (
              <HeartIconOutline className="w-5 h-5" />
            )}
            <span className="ml-1 min-w-[1rem] text-sm text-slate-400">{likeCount}</span>
            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-sm text-slate-200 opacity-0 transition before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-black before:content-[''] group-hover:opacity-100">
              {isLiked ? 'Unlike script' : 'Like script'}
            </span>
          </button>
          <Link
            href={`/api/new?name=${encodeURIComponent(script.dashedName || 'script.ts')}&url=${encodeURIComponent(`${baseUrl}/scripts/${script.id}/raw`)}`}
            className="text-slate-400 hover:text-amber-300 transition-colors group relative flex items-center h-5"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-sm text-slate-200 opacity-0 transition before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-black before:content-[''] group-hover:opacity-100">
              Install script
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
