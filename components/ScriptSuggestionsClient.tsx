'use client'

import type { Suggestion } from '@/lib/getRandomSuggestions'

interface Props {
  suggestions: Suggestion[]
  onSelect: (suggestion: Suggestion) => void
  className?: string
}

export default function ScriptSuggestionsClient({ suggestions, onSelect, className = '' }: Props) {
  return (
    <div className="flex justify-center">
      <div
        className={`max-w-full flex flex-nowrap gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent ${className}`}
      >
        {suggestions.slice(0, 3).map((suggestion, idx) => (
          <button
            type="button"
            key={idx}
            onClick={() => onSelect(suggestion)}
            className="text-sm bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1 rounded-full transition-colors duration-200 shrink-0 h-7"
          >
            {suggestion.title}
          </button>
        ))}
      </div>
    </div>
  )
}
