'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid'
import { CheckCircleIcon as CheckCircleIconOutline } from '@heroicons/react/24/outline'

interface VerifyButtonProps {
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
}: VerifyButtonProps) {
  const [isVerified, setIsVerified] = useState(initialIsVerified)
  const [verifiedCount, setVerifiedCount] = useState(initialVerifiedCount)
  const [isTogglingVerification, setIsTogglingVerification] = useState(false)

  const handleToggleVerification = async () => {
    if (!isAuthenticated) {
      signIn()
      return
    }

    setIsTogglingVerification(true)
    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId }),
      })
      if (!response.ok) {
        throw new Error('Failed to verify script')
      }
      const data = await response.json()
      setIsVerified(data.isVerified)
      setVerifiedCount(data.verifiedCount)
    } catch (error) {
      console.error('Verification error:', error)
      alert('Failed to toggle verification')
    } finally {
      setIsTogglingVerification(false)
    }
  }

  return (
    <button
      onClick={handleToggleVerification}
      disabled={isTogglingVerification}
      className="text-slate-400 hover:text-green-500 transition-colors group relative flex items-center h-5"
      title={isVerified ? 'Unverify script' : 'Verify script'}
    >
      {isVerified ? (
        <CheckCircleIconSolid
          className={`w-5 h-5 ${isTogglingVerification ? 'animate-pulse' : ''}`}
        />
      ) : (
        <CheckCircleIconOutline
          className={`w-5 h-5 ${isTogglingVerification ? 'animate-pulse' : ''}`}
        />
      )}
      <span className="ml-1">{verifiedCount}</span>
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-sm text-slate-200 opacity-0 transition before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-black before:content-[''] group-hover:opacity-100">
        {isVerified ? 'Unverify script' : 'Verify script'}
      </span>
    </button>
  )
}
