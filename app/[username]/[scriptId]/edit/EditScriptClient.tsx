'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Editor } from '@monaco-editor/react'
import { toast } from 'react-hot-toast'
import { monacoOptions, initializeTheme } from '@/lib/monaco'

interface Props {
  initialContent: string
  username: string
  scriptId: string
}

export default function EditScriptClient({ initialContent, username, scriptId }: Props) {
  const [content, setContent] = useState(initialContent)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()

  async function handleSave() {
    setIsSaving(true)
    try {
      const response = await fetch(`/${username}/${scriptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update script')
      }

      toast.success('Script saved successfully')
      router.push(`/${username}/${scriptId}`)
    } catch (error) {
      console.error('Error saving script:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save script')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="border border-amber-400/10 rounded bg-neutral-900/90">
        <Editor
          height="60vh"
          defaultLanguage="typescript"
          value={content}
          onChange={val => setContent(val || '')}
          beforeMount={initializeTheme}
          options={monacoOptions}
          theme="brillance-black"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => router.push(`/${username}/${scriptId}`)}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-400 text-black hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}