'use client'
import { useState } from 'react'
import { Tooltip } from '@nextui-org/react'
import { GitBranch } from 'lucide-react'
import { safeLocalStorage } from '@/lib/event-handlers'

interface ForkButtonClientProps {
  scriptId: string
  scriptContent: string
}

export default function ForkButtonClient({ scriptContent }: ForkButtonClientProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleFork = async () => {
    setIsLoading(true)
    try {
      const forkedText = `${scriptContent.trim()}

---(Original code above)---
We want to modify the script above with the following instructions:
`
      safeLocalStorage.setItem('forkedScriptContent', forkedText)
      if (typeof window !== 'undefined' && document.activeElement && 'blur' in document.activeElement) {
        (document.activeElement as HTMLElement).blur()
      }
      // TODO: Hack to remove focus from the fork button
      window.location.href = '/'
    } catch (error) {
      console.error('Error forking script:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Tooltip content="Fork this script in the prompt">
      <div>
        <button
          onClick={handleFork}
          disabled={isLoading}
          className="inline-flex items-center p-2 text-sm font-medium rounded-lg bg-blue-400/10 text-blue-300 hover:bg-blue-400/20 transition-colors disabled:opacity-50"
        >
          <GitBranch className="w-4 h-4" />
        </button>
      </div>
    </Tooltip>
  )
}
