'use client'
import { useState } from 'react'
import { Tooltip } from '@nextui-org/react'
import { STRINGS } from '@/lib/strings'
import { installScript } from '@/lib/openrouterService'

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
    console.log('[INSTALL_BUTTON] Install button clicked', {
      scriptId,
      dashedName,
      currentInstallCount: installCount,
      timestamp: new Date().toISOString(),
    })

    setIsInstalling(true)

    try {
      console.log('[INSTALL_BUTTON] Calling shared installScript function', {
        scriptId,
        dashedName,
        timestamp: new Date().toISOString(),
      })

      // Use the shared install logic
      await installScript(scriptId, dashedName)

      console.log('[INSTALL_BUTTON] Installation successful, updating install count', {
        scriptId,
        dashedName,
        previousCount: installCount,
        newCount: installCount + 1,
        timestamp: new Date().toISOString(),
      })

      setInstallCount(installCount + 1)
    } catch (error) {
      console.error('[INSTALL_BUTTON] Error installing script', {
        scriptId,
        dashedName,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      })
    } finally {
      console.log('[INSTALL_BUTTON] Installation process completed', {
        scriptId,
        dashedName,
        successful: !isInstalling,
        timestamp: new Date().toISOString(),
      })

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
