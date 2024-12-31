'use client'
import { useState } from 'react'
import { Tooltip } from '@nextui-org/react'

interface VerifyButtonClientProps {
  scriptId: string
  initialIsVerified: boolean
  initialVerifiedCount: number
  isAuthenticated: boolean
}

export default function VerifyButtonClient({
  scriptId,
  initialIsVerified,
  initialVerifiedCount,
  isAuthenticated,
}: VerifyButtonClientProps) {
  const [isVerified, setIsVerified] = useState(initialIsVerified)
  const [verifiedCount, setVerifiedCount] = useState(initialVerifiedCount)
  const [isLoading, setIsLoading] = useState(false)

  const handleVerify = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to verify scripts')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scriptId }),
      })

      if (!response.ok) {
        throw new Error('Failed to verify script')
      }

      setIsVerified(!isVerified)
      setVerifiedCount(verifiedCount + (isVerified ? -1 : 1))
    } catch (error) {
      console.error('Error verifying script:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Tooltip content={isVerified ? 'Remove verification' : 'Verify script'}>
      <button
        onClick={handleVerify}
        disabled={isLoading}
        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 transition-colors disabled:opacity-50"
      >
        <svg
          className={`w-4 h-4 ${isVerified ? 'text-amber-300' : ''}`}
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
