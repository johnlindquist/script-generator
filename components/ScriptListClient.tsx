'use client'

import { ScriptsResponse } from '@/types/script'
import InfiniteScrollGrid from './InfiniteScrollGrid'

interface ScriptListClientProps {
  isAuthenticated: boolean
  currentUserId?: string
  initialData: ScriptsResponse
}

export default function ScriptListClient({
  isAuthenticated,
  currentUserId,
  initialData,
}: ScriptListClientProps) {
  return (
    <InfiniteScrollGrid
      initialScripts={initialData.scripts}
      isAuthenticated={isAuthenticated}
      currentUserId={currentUserId}
      totalScripts={initialData.totalPages * 12} // Approximate total
    />
  )
}
