import ScriptSuggestionsClient from '@/components/ScriptSuggestionsClient'
import type { Suggestion } from '@/lib/getRandomSuggestions'

interface Props {
  setPrompt: (prompt: string) => void
  setIsFromSuggestion: (value: boolean) => void
  className?: string
  suggestions: Suggestion[]
}

export default function ScriptSuggestions({
  setPrompt,
  setIsFromSuggestion,
  className,
  suggestions,
}: Props) {
  return (
    <div className="min-h-[28px]">
      <ScriptSuggestionsClient
        setPrompt={setPrompt}
        setIsFromSuggestion={setIsFromSuggestion}
        className={className}
        suggestions={suggestions}
      />
    </div>
  )
}
