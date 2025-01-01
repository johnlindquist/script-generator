'use client'
import { useState } from 'react'
import { Tooltip } from '@nextui-org/react'
import { STRINGS } from '@/lib/strings'

interface VerifyButtonClientProps {
  scriptId: string
  initialIsVerified: boolean
  initialVerifiedCount: number
  isAuthenticated: boolean
  isOwner: boolean
  onScriptChanged?: () => void
}

export default function VerifyButtonClient({
  scriptId,
  initialIsVerified,
  initialVerifiedCount,
  isAuthenticated,
  isOwner,
  onScriptChanged,
}: VerifyButtonClientProps) {
  const [isVerified, setIsVerified] = useState(initialIsVerified)
  const [verifiedCount, setVerifiedCount] = useState(initialVerifiedCount)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Hide button if not logged in OR is the script owner
  if (!isAuthenticated || isOwner) {
    return null
  }

  const handleVerify = async () => {
    if (!isAuthenticated) {
      alert(STRINGS.VERIFY_BUTTON.signInRequired)
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ scriptId }),
      })

      if (response.status === 401) {
        throw new Error(STRINGS.VERIFY_BUTTON.signInRequired)
      }

      if (!response.ok) {
        throw new Error(STRINGS.VERIFY_BUTTON.error)
      }

      // Only update UI after successful API call
      setIsVerified(!isVerified)
      setVerifiedCount(verifiedCount + (isVerified ? -1 : 1))
      onScriptChanged?.()
    } catch (error) {
      console.error('Error verifying script:', error)
      setError(error instanceof Error ? error.message : STRINGS.VERIFY_BUTTON.error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Tooltip
      content={
        error ||
        (isVerified ? STRINGS.VERIFY_BUTTON.tooltipRemove : STRINGS.VERIFY_BUTTON.tooltipAdd)
      }
    >
      <button
        onClick={handleVerify}
        disabled={isLoading || !isAuthenticated}
        className={`inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 transition-colors disabled:opacity-50 ${
          error ? 'border-red-500 border' : ''
        } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <svg
          className={`w-4 h-4 ${isVerified ? 'text-green-400' : ''} ${error ? 'text-red-500' : ''}`}
          fill={isVerified ? 'currentColor' : 'none'}
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>{verifiedCount}</span>
      </button>
    </Tooltip>
  )
}
