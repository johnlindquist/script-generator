import suggestionsData from '@/data/suggestions.json'

export interface Suggestion {
  title: string
  description: string
  keyFeatures: string[]
}

export const SUGGESTIONS: Suggestion[] = suggestionsData.suggestions

let suggestionsPromise: Promise<Suggestion[]> | null = null

export function getRandomSuggestions(): Promise<Suggestion[]> {
  const suggestions = [...SUGGESTIONS]
  for (let i = suggestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[suggestions[i], suggestions[j]] = [suggestions[j], suggestions[i]]
  }
  if (!suggestionsPromise) {
    suggestionsPromise = new Promise(resolve => {
      const delay = process.env.NODE_ENV === 'development' ? 0 : 0
      setTimeout(() => {
        resolve(suggestions.slice(0, 7))
      }, delay)
    })
  }
  return suggestionsPromise
}

export function resetSuggestionsCache() {
  suggestionsPromise = null
}
