import { forwardRef, Suspense } from 'react'
import ScriptSuggestionsClient from '@/components/ScriptSuggestionsClient'

interface Props {
  setPrompt: (prompt: string) => void
  setIsFromSuggestion: (value: boolean) => void
  className?: string
}

function SuggestionsLoadingSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className="flex justify-center">
      <div className={`max-w-full flex flex-nowrap gap-2 overflow-x-auto ${className}`}>
        {Array.from({ length: 7 }).map((_, idx) => (
          <div
            key={idx}
            className="text-sm bg-amber-400/5 px-3 py-1 rounded-full animate-pulse w-48 h-7 shrink-0"
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  )
}

const ScriptSuggestions = forwardRef<{ refreshSuggestions: () => void }, Props>(
  ({ setPrompt, setIsFromSuggestion, className }, ref) => {
    return (
      <div className="min-h-[28px]">
        <Suspense fallback={<SuggestionsLoadingSkeleton className={className} />}>
          <ScriptSuggestionsClient
            ref={ref}
            setPrompt={setPrompt}
            setIsFromSuggestion={setIsFromSuggestion}
            className={className}
          />
        </Suspense>
      </div>
    )
  }
)

ScriptSuggestions.displayName = 'ScriptSuggestions'

export default ScriptSuggestions
