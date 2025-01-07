'use client'
import { useState } from 'react'
import { Tooltip } from '@nextui-org/react'
import { STRINGS } from '@/lib/strings'

interface InstallButtonClientProps {
  scriptId: string
  dashedName: string | null | undefined
  initialInstallCount: number
}

export default function InstallButtonClient({
  scriptId,
  dashedName,
  initialInstallCount,
}: InstallButtonClientProps) {
  const [installCount, setInstallCount] = useState(initialInstallCount)
  const [isInstalling, setIsInstalling] = useState(false)

  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      const response = await fetch('/api/install', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scriptId }),
      })

      if (!response.ok) {
        throw new Error(STRINGS.INSTALL_BUTTON.error)
      }

      setInstallCount(installCount + 1)

      if (dashedName) {
        window.location.href = `kit://script/install/${dashedName}`
      }
    } catch (error) {
      console.error('Error installing script:', error)
    } finally {
      setIsInstalling(false)
    }
  }

  return (
    <Tooltip content={STRINGS.INSTALL_BUTTON.tooltip}>
      <button
        onClick={handleInstall}
        disabled={isInstalling}
        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg bg-primary/10 text-amber-300 hover:bg-primary/20 transition-colors disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
        <span>{installCount}</span>
      </button>
    </Tooltip>
  )
}
