import ScriptSuggestionsClient from '@/components/ScriptSuggestionsClient'
import type { Suggestion } from '@/lib/getRandomSuggestions'

interface Props {
  suggestions: Suggestion[]
  onSelect: (suggestion: Suggestion) => void
  className?: string
}

export default function ScriptSuggestions({ suggestions, onSelect, className }: Props) {
  return (
    <div className="min-h-[28px]">
      <ScriptSuggestionsClient
        suggestions={suggestions}
        onSelect={onSelect}
        className={className}
      />
    </div>
  )
}
