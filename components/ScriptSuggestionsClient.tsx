'use client'

import type { Suggestion } from '@/lib/getRandomSuggestions'

interface Props {
  setPrompt: (prompt: string) => void
  setIsFromSuggestion: (value: boolean) => void
  className?: string
  suggestions: Suggestion[]
  onSelect?: () => void
}

export default function ScriptSuggestionsClient({
  setPrompt,
  setIsFromSuggestion,
  className = '',
  suggestions,
  onSelect,
}: Props) {
  return (
    <div className="flex justify-center">
      <div
        className={`max-w-full flex flex-nowrap gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent ${className}`}
      >
        {suggestions.slice(0, 3).map((suggestion, idx) => (
          <button
            type="button"
            key={idx}
            onClick={() => {
              setIsFromSuggestion(true)
              setPrompt(
                `${suggestion.title}\n${suggestion.description}\n${suggestion.keyFeatures?.length ? 'Key Features: ' : ''}${suggestion.keyFeatures.join(', ')}`
              )
              if (onSelect) {
                onSelect()
              }
            }}
            className="text-sm bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1 rounded-full transition-colors duration-200 shrink-0 h-7"
          >
            {suggestion.title}
          </button>
        ))}
      </div>
    </div>
  )
}
