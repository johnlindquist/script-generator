import { forwardRef } from 'react'
import ScriptSuggestionsClient from '@/components/ScriptSuggestionsClient'

interface Props {
  setPrompt: (prompt: string) => void
  setIsFromSuggestion: (value: boolean) => void
  className?: string
}

const ScriptSuggestions = forwardRef<{ refreshSuggestions: () => void }, Props>(
  ({ setPrompt, setIsFromSuggestion, className }, ref) => {
    return (
      <ScriptSuggestionsClient
        ref={ref}
        setPrompt={setPrompt}
        setIsFromSuggestion={setIsFromSuggestion}
        className={className}
      />
    )
  }
)

ScriptSuggestions.displayName = 'ScriptSuggestions'

export default ScriptSuggestions
