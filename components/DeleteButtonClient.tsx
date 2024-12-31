'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tooltip } from '@nextui-org/react'

interface DeleteButtonClientProps {
  scriptId: string
}

export default function DeleteButtonClient({ scriptId }: DeleteButtonClientProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this script?')) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/scripts/${scriptId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete script')
      }

      router.refresh()
    } catch (error) {
      console.error('Error deleting script:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Tooltip content="Delete script">
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-red-400/10 text-red-300 hover:bg-red-400/20 transition-colors disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </Tooltip>
  )
}
