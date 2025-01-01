'use client'
import { useState } from 'react'
import { Tooltip } from '@nextui-org/react'
import { ShieldCheckIcon } from '@heroicons/react/24/outline'
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

  const handleVerify = async () => {
    if (!isAuthenticated) {
      alert(STRINGS.VERIFY_BUTTON.signInRequired)
      return
    }

    if (isOwner) {
      alert("You can't verify your own script")
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

  const tooltipContent = isOwner
    ? "You can't verify your own script"
    : !isAuthenticated
      ? STRINGS.VERIFY_BUTTON.signInRequired
      : error ||
        (isVerified ? STRINGS.VERIFY_BUTTON.tooltipRemove : STRINGS.VERIFY_BUTTON.tooltipAdd)

  return (
    <Tooltip content={tooltipContent}>
      <button
        onClick={handleVerify}
        disabled={isLoading || !isAuthenticated || isOwner}
        className={`inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 transition-colors disabled:opacity-50 ${
          error ? 'border-red-500 border' : ''
        } ${!isAuthenticated || isOwner ? 'opacity-50 cursor-not-allowed' : ''}${isVerified ? 'bg-green-400/25' : ''}`}
      >
        <ShieldCheckIcon
          className={`w-4 h-4 ${isVerified ? 'text-green-400' : ''} ${error ? 'text-red-500' : ''}`}
        />
        <span>{verifiedCount}</span>
      </button>
    </Tooltip>
  )
}
