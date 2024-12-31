'use client'

import { useState, useEffect, forwardRef, useImperativeHandle, useRef, use } from 'react'
import { getRandomSuggestions, Suggestion, resetSuggestionsCache } from '@/lib/suggestions'

interface Props {
  setPrompt: (prompt: string) => void
  setIsFromSuggestion: (value: boolean) => void
  className?: string
}

const ScriptSuggestionsClient = forwardRef<{ refreshSuggestions: () => void }, Props>(
  ({ setPrompt, setIsFromSuggestion, className = '' }, ref) => {
    const suggestions = use(getRandomSuggestions())
    const [visibleSuggestions, setVisibleSuggestions] = useState<Suggestion[]>([])
    const containerRef = useRef<HTMLDivElement>(null)
    const buttonsRef = useRef<(HTMLButtonElement | null)[]>([])

    const refreshSuggestions = () => {
      resetSuggestionsCache()
    }

    useImperativeHandle(ref, () => ({
      refreshSuggestions,
    }))

    // Calculate visible suggestions based on container width
    useEffect(() => {
      if (!containerRef.current || suggestions.length === 0) return

      const calculateVisibleSuggestions = () => {
        const containerWidth = containerRef.current?.offsetWidth || 0
        let totalWidth = 0
        const gap = 8 // gap-2 = 0.5rem = 8px
        const visible: Suggestion[] = []

        buttonsRef.current.forEach((buttonRef, index) => {
          if (!buttonRef) return

          const buttonWidth = buttonRef.offsetWidth
          if (totalWidth + buttonWidth + (index > 0 ? gap : 0) <= containerWidth) {
            visible.push(suggestions[index])
            totalWidth += buttonWidth + (index > 0 ? gap : 0)
          }
        })

        setVisibleSuggestions(visible)
      }

      // Create a ResizeObserver to handle container size changes
      const resizeObserver = new ResizeObserver(calculateVisibleSuggestions)
      resizeObserver.observe(containerRef.current)

      // Initial calculation
      calculateVisibleSuggestions()

      return () => {
        resizeObserver.disconnect()
      }
    }, [suggestions])

    return (
      <div ref={containerRef} className={`flex flex-nowrap justify-center gap-2 ${className}`}>
        {suggestions.map((suggestion, idx) => (
          <button
            type="button"
            key={idx}
            ref={el => {
              buttonsRef.current[idx] = el
            }}
            onClick={() => {
              setIsFromSuggestion(true)
              setPrompt(
                `${suggestion.title}\n${suggestion.description}\n${suggestion.keyFeatures.join(', ')}`
              )
            }}
            className={`text-sm bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full transition-colors duration-200 shrink-0 h-7 ${!visibleSuggestions.includes(suggestion) ? 'hidden' : ''}`}
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
