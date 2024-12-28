'use client'

interface Props {
  suggestions: string[]
  setPrompt: (prompt: string) => void
}

export default function ScriptSuggestionsClient({ suggestions, setPrompt }: Props) {
  return (
    <div className="flex flex-wrap justify-center gap-2 mt-4">
      {suggestions.map((suggestion, idx) => (
        <button
          key={idx}
          onClick={() => setPrompt(suggestion)}
          className="text-sm bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full transition-colors duration-200"
        >
          {suggestion}
        </button>
      ))}
    </div>
  )
}
