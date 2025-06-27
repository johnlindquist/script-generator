'use client'

import { useState, useEffect } from 'react'
import { Button } from './ui/button'

interface Category {
  category: string
  functions: string[]
}

interface Props {
  categories: Category[]
  snippets: Record<string, string>
  prompt: string
  setPrompt: (prompt: string) => void
}

export default function PromptBuilderClient({ categories, snippets, prompt, setPrompt }: Props) {
  const [selectedCategory, setSelectedCategory] = useState(categories?.[0]?.category || '')
  const [selectedFunc, setSelectedFunc] = useState('')

  useEffect(() => {
    if (!categories || categories.length === 0) return
    const first = categories.find(c => c.category === selectedCategory)?.functions[0] || ''
    setSelectedFunc(first)
  }, [selectedCategory, categories])

  const insertSnippet = () => {
    const snippet = snippets[selectedFunc] || selectedFunc
    const newPrompt = prompt ? `${prompt}\n${snippet}` : snippet
    setPrompt(newPrompt)
  }

  const functions = categories?.find(c => c.category === selectedCategory)?.functions || []

  // Don't render if no categories are available
  if (!categories || categories.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex gap-2 items-center">
        <select
          className="border rounded px-2 py-1 bg-background"
          value={selectedCategory}
          onChange={e => setSelectedCategory((e.target as HTMLInputElement).value)}
        >
          {categories.map(cat => (
            <option key={cat.category} value={cat.category}>
              {cat.category}
            </option>
          ))}
        </select>
        <select
          className="border rounded px-2 py-1 bg-background"
          value={selectedFunc}
          onChange={e => setSelectedFunc((e.target as HTMLInputElement).value)}
        >
          {functions.map(fn => (
            <option key={fn} value={fn}>
              {fn}
            </option>
          ))}
        </select>
        <Button type="button" size="sm" onClick={insertSnippet}>
          Insert
        </Button>
      </div>
      {selectedFunc && snippets[selectedFunc] && (
        <pre className="whitespace-pre-wrap text-xs bg-muted p-2 rounded overflow-auto">
          {snippets[selectedFunc]}
        </pre>
      )}
    </div>
  )
}
