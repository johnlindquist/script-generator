import { forwardRef } from 'react'
import ScriptSuggestionsClient from '@/components/ScriptSuggestionsClient'

interface Props {
  setPrompt: (prompt: string) => void
}

const ScriptSuggestions = forwardRef<{ refreshSuggestions: () => void }, Props>(
  ({ setPrompt }, ref) => {
    return <ScriptSuggestionsClient ref={ref} setPrompt={setPrompt} />
  }
)

ScriptSuggestions.displayName = 'ScriptSuggestions'

export default ScriptSuggestions
