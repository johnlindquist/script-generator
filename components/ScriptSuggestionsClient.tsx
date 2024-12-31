'use client'

import { forwardRef, use } from 'react'
import { getRandomSuggestions } from '@/lib/suggestions'

interface Props {
  setPrompt: (prompt: string) => void
  setIsFromSuggestion: (value: boolean) => void
  className?: string
}

const ScriptSuggestionsClient = forwardRef<{ refreshSuggestions: () => void }, Props>(
  ({ setPrompt, setIsFromSuggestion, className = '' }) => {
    const suggestions = use(getRandomSuggestions())

    return (
      <div className="flex justify-center">
        <div
          className={`max-w-full flex flex-nowrap gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent ${className}`}
        >
          {suggestions.map((suggestion, idx) => (
            <button
              type="button"
              key={idx}
              onClick={() => {
                setIsFromSuggestion(true)
                setPrompt(
                  `${suggestion.title}\n${suggestion.description}\n${suggestion.keyFeatures.join(', ')}`
                )
              }}
              className="text-sm bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full transition-colors duration-200 shrink-0 h-7"
            >
              {suggestion.title}
            </button>
          ))}
        </div>
      </div>
    )
  }
)

ScriptSuggestionsClient.displayName = 'ScriptSuggestionsClient'

export default ScriptSuggestionsClient
