'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Editor } from '@monaco-editor/react'

export default function NewScriptPage() {
  const { data: session } = useSession()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!session) {
    router.push('/api/auth/signin')
    return null
  }

  async function createScript() {
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.')
      return
    }

    setIsSubmitting(true)
    setError(null)

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
        throw new Error('Failed to create script')
      }

      const data = await response.json()
      router.push(`/scripts/${data.id}`)
    } catch (err) {
      setError('Error creating script. Please try again.')
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Create New Script</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="Enter script title..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">Script Content</label>
          <div className="h-[500px] border border-gray-700 rounded-lg overflow-hidden">
            <Editor
              defaultLanguage="typescript"
              theme="vs-dark"
              value={content}
              onChange={value => setContent(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
              }}
            />
          </div>
        </div>

        <button
          onClick={createScript}
          disabled={isSubmitting}
          className="bg-gradient-to-tr from-amber-300 to-amber-400 text-gray-900 font-semibold px-6 py-2 rounded-lg shadow-2xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating...' : 'Create Script'}
        </button>
      </div>
    </div>
  )
}
