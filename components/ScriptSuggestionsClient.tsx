'use client'

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { getRandomSuggestions, Suggestion } from '@/lib/suggestions'

interface Props {
  setPrompt: (prompt: string) => void
  className?: string
}

const ScriptSuggestionsClient = forwardRef<{ refreshSuggestions: () => void }, Props>(
  ({ setPrompt, className = '' }, ref) => {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([])

    useEffect(() => {
      setSuggestions(getRandomSuggestions())
    }, [])

    const refreshSuggestions = () => {
      setSuggestions(getRandomSuggestions())
    }

    useImperativeHandle(ref, () => ({
      refreshSuggestions,
    }))

    return (
      <div className={`flex flex-wrap justify-center gap-2 ${className}`}>
        {suggestions.map((suggestion, idx) => (
          <button
            type="button"
            key={idx}
            onClick={() =>
              setPrompt(
                `${suggestion.title}\n${suggestion.description}\n${suggestion.keyFeatures.join(', ')}`
              )
            }
            className="text-sm bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full transition-colors duration-200"
          >
            {suggestion.title}
          </button>
        ))}
      </div>
    )
  }
)

ScriptSuggestionsClient.displayName = 'ScriptSuggestionsClient'

export default ScriptSuggestionsClient
