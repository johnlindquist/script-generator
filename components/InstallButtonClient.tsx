'use client'
import { useState } from 'react'
import { ArrowDownTrayIcon } from '@heroicons/react/24/solid'

interface InstallButtonProps {
  scriptId: string
  dashedName: string | null | undefined
  initialInstallCount: number
}

export default function InstallButtonClient({
  scriptId,
  dashedName,
  initialInstallCount,
}: InstallButtonProps) {
  const [installCount, setInstallCount] = useState(initialInstallCount)
  const [isTogglingInstall, setIsTogglingInstall] = useState(false)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://scriptkit.com'

  const handleInstall = async () => {
    setIsTogglingInstall(true)
    try {
      const response = await fetch('/api/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId }),
      })
      if (!response.ok) {
        throw new Error('Failed to track install')
      }
      const data = await response.json()
      setInstallCount(data.installCount)

      // Continue with the actual install
      window.location.href = `/api/new?name=${encodeURIComponent(dashedName || 'script-name-not-found')}&url=${encodeURIComponent(`${baseUrl}/scripts/${scriptId}/raw/${dashedName || 'script'}.ts`)}`
    } catch (error) {
      console.error('Install error:', error)
      alert('Failed to track install')
    } finally {
      setIsTogglingInstall(false)
    }
  }

  return (
    <button
      onClick={handleInstall}
      disabled={isTogglingInstall}
      className="text-slate-400 hover:text-amber-300 transition-colors group relative flex items-center h-5"
      title="Install script"
    >
      <ArrowDownTrayIcon className={`w-5 h-5 ${isTogglingInstall ? 'animate-pulse' : ''}`} />
      <span className="ml-1">{installCount}</span>
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-sm text-slate-200 opacity-0 transition before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-black before:content-[''] group-hover:opacity-100">
        Install script
      </span>
    </button>
  )
}
