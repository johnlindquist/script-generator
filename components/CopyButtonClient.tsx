'use client'
import { useState } from 'react'
import { Tooltip } from '@nextui-org/react'
import { STRINGS } from '@/lib/strings'

interface CopyButtonClientProps {
  content: string
}

export default function CopyButtonClient({ content }: CopyButtonClientProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Tooltip
      content={copied ? STRINGS.COPY_BUTTON.tooltipCopied : STRINGS.COPY_BUTTON.tooltipDefault}
    >
      <button
        onClick={handleCopy}
        className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 transition-colors"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
        </svg>
      </button>
    </Tooltip>
  )
}
