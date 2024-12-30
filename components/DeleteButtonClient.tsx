'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrashIcon, XMarkIcon } from '@heroicons/react/24/solid'

interface DeleteButtonProps {
  scriptId: string
}

export default function DeleteButtonClient({ scriptId }: DeleteButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/scripts/${scriptId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete script')
      }

      // Emit a custom event that the parent page can listen to
      const event = new CustomEvent('scriptDeleted', {
        detail: { scriptId },
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

  return (
    <>
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
  )
}
