'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tooltip } from '@nextui-org/react'
import { toast } from 'react-hot-toast'
import { STRINGS } from '@/lib/strings'
import { useSession } from 'next-auth/react'

interface DeleteButtonClientProps {
  scriptId: string
  onDeleted?: (scriptId: string) => void
}

export default function DeleteButtonClient({ scriptId, onDeleted }: DeleteButtonClientProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/${session?.user?.username}/${scriptId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        const errorMsg =
          errorBody?.error ||
          STRINGS.DELETE_BUTTON.errorMessageWithStatus.replace(
            '{status}',
            response.status.toString()
          )
        throw new Error(errorMsg)
      }

      toast.success(STRINGS.DELETE_BUTTON.successMessage)
      onDeleted?.(scriptId)
      router.refresh()
    } catch (error: unknown) {
      console.error('Error deleting script:', error)
      toast.error(error instanceof Error ? error.message : STRINGS.DELETE_BUTTON.errorMessage)
    } finally {
      setIsDeleting(false)
      setIsConfirming(false)
    }
  }

  return (
    <>
      {isConfirming ? (
        <div className="inline-flex items-center gap-2">
          <Tooltip content={STRINGS.DELETE_BUTTON.tooltipConfirm}>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 text-sm font-medium rounded-lg bg-red-400/10 text-red-300 hover:bg-red-400/20 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
          </Tooltip>
          <Tooltip content={STRINGS.DELETE_BUTTON.tooltipCancel}>
            <button
              onClick={() => setIsConfirming(false)}
              disabled={isDeleting}
              className="p-2 text-sm font-medium rounded-lg bg-gray-400/10 text-gray-300 hover:bg-gray-400/20 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </Tooltip>
        </div>
      ) : (
        <Tooltip content={STRINGS.DELETE_BUTTON.tooltipDelete}>
          <button
            onClick={() => setIsConfirming(true)}
            disabled={isDeleting}
            className="inline-flex items-center p-2 text-sm font-medium rounded-lg bg-red-400/10 text-red-300 hover:bg-red-400/20 transition-colors disabled:opacity-50"
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
      )}
    </>
  )
}
