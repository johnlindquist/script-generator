'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Editor } from '@monaco-editor/react'
import { toast } from 'react-hot-toast'
import { monacoOptions, initializeTheme } from '@/lib/monaco'

// Simple client-side script parser
function parseScriptName(content: string): string | null {
  const nameMatch = content.match(/\/\/\s*Name:\s*(.+)/i)
  return nameMatch ? nameMatch[1].trim() : null
}

const defaultContent = `// Name: My Script
// Description: What this script does

import "@johnlindquist/kit"

// Your TypeScript code here...
await notify("Hello from Script Kit!")`

export default function NewScriptClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [content, setContent] = useState(defaultContent)
  const [title, setTitle] = useState('')
  const [, setIsSaving] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Check for script content in URL query parameters
  useEffect(() => {
    const scriptFromQuery = searchParams?.get('script')
    const scriptFromQueryB64 = searchParams?.get('script_b64')

    let finalScript = null
    if (scriptFromQuery) {
      finalScript = scriptFromQuery
    } else if (scriptFromQueryB64) {
      try {
        // First URL-decode, then base64-decode
        const urlDecodedScript = decodeURIComponent(scriptFromQueryB64)
        finalScript = atob(urlDecodedScript)
      } catch (e) {
        console.error('Failed to decode base64 script:', e)
      }
    }

    if (finalScript) {
      setContent(finalScript)

      // Try to extract title from the script
      const name = parseScriptName(finalScript)
      if (name) {
        setTitle(name)
      }
    }
  }, [searchParams])

  async function handleSave() {
    if (isCreating) return
    setIsCreating(true)
    if (!title.trim()) {
      toast.error('Please enter a script title')
      return
    }

    if (!content.trim()) {
      toast.error('Please enter some script content')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: title,
          code: content,
          saved: true,
        }),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || 'Failed to create script')
      }

      const script = (await response.json()) as { id: string }
      toast.success('Script created successfully')
      router.push(`/scripts/${script.id}`)
    } catch (error) {
      console.error('Error creating script:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create script')
    } finally {
      setIsCreating(false)
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="mb-4">
        <label htmlFor="title" className="block text-sm font-medium text-amber-300 mb-2">
          Script Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setTitle((e.target as HTMLInputElement).value)
          }
          className="w-full px-4 py-2 rounded-lg bg-neutral-800 border border-amber-400/20 text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
          placeholder="Enter script title"
        />
      </div>
      <div className="border border-amber-400/10 rounded bg-neutral-900/90">
        <Editor
          height="80vh"
          defaultLanguage="typescript"
          value={content}
          onChange={val => setContent(val || '')}
          beforeMount={initializeTheme}
          options={monacoOptions}
          theme="gruvboxTheme"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isCreating}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCreating ? 'Creating...' : 'Create Script'}
        </button>
      </div>
    </div>
  )
}
