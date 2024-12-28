import { getRandomSuggestions } from '@/lib/suggestions'
import ScriptSuggestionsClient from './ScriptSuggestionsClient'

export default function ScriptSuggestions({ setPrompt }: { setPrompt: (prompt: string) => void }) {
  // Get random suggestions on the server
  const suggestions = getRandomSuggestions()

  return <ScriptSuggestionsClient suggestions={suggestions} setPrompt={setPrompt} />
}
