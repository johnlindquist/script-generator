'use client'
import { useState } from 'react'
import { Tooltip } from '@nextui-org/react'
import { ShieldCheckIcon } from '@heroicons/react/24/outline'
import { STRINGS } from '@/lib/strings'
import useSWR from 'swr'
import { useParams } from 'next/navigation'

interface VerifyButtonClientProps {
  scriptId: string
  initialIsVerified: boolean
  initialVerifiedCount: number
  isAuthenticated: boolean
  isOwner: boolean
  onScriptChanged?: () => void
}

interface Script {
  id: string
  isVerified: boolean
  _count: {
    verifications: number
  }
}

interface ScriptsResponse {
  scripts: Script[]
}

export default function VerifyButtonClient({
  scriptId,
  initialIsVerified,
  initialVerifiedCount,
  isAuthenticated,
  isOwner,
}: VerifyButtonClientProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const params = useParams()
  const username = params?.username as string | undefined

  // Use the same SWR key as the parent component
  const apiUrl = username ? `/${username}/api/scripts?page=1` : `/api/scripts?page=1`
  const { mutate } = useSWR(apiUrl)

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
    setError(null)

    try {
      // Optimistically update the UI
      mutate(
        async (currentData: ScriptsResponse | undefined) => {
          if (!currentData) return currentData

          const updatedScripts = currentData.scripts.map((script: Script) =>
            script.id === scriptId
              ? {
                  ...script,
                  isVerified: !script.isVerified,
                  _count: {
                    ...script._count,
                    verifications: script._count.verifications + (script.isVerified ? -1 : 1),
                  },
                }
              : script
          )

          return { ...currentData, scripts: updatedScripts }
        },
        { revalidate: false }
      )

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

      const data = await response.json()

      // Update with the real data from the server
      mutate(
        async (currentData: ScriptsResponse | undefined) => {
          if (!currentData) return currentData

          const updatedScripts = currentData.scripts.map((script: Script) =>
            script.id === scriptId
              ? {
                  ...script,
                  isVerified: data.isVerified,
                  _count: {
                    ...script._count,
                    verifications: data.verifiedCount,
                  },
                }
              : script
          )

          return { ...currentData, scripts: updatedScripts }
        },
        { revalidate: false }
      )
    } catch (error) {
      console.error('Error verifying script:', error)
      setError(error instanceof Error ? error.message : STRINGS.VERIFY_BUTTON.error)

      // Revert the optimistic update on error
      mutate()
    } finally {
      setIsLoading(false)
    }
  }

  // Get the current state from the SWR cache
  const currentScript = useSWR<ScriptsResponse>(apiUrl).data?.scripts?.find(
    (s: Script) => s.id === scriptId
  )
  const isVerified = currentScript?.isVerified ?? initialIsVerified
  const verifiedCount = currentScript?._count?.verifications ?? initialVerifiedCount

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
