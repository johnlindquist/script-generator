import { forwardRef } from 'react'
import ScriptSuggestionsClient from '@/components/ScriptSuggestionsClient'

interface Props {
  setPrompt: (prompt: string) => void
  className?: string
}

const ScriptSuggestions = forwardRef<{ refreshSuggestions: () => void }, Props>(
  ({ setPrompt, className }, ref) => {
    return <ScriptSuggestionsClient ref={ref} setPrompt={setPrompt} className={className} />
  }
)

ScriptSuggestions.displayName = 'ScriptSuggestions'

export default ScriptSuggestions
