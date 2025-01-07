'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Editor } from '@monaco-editor/react'
import Link from 'next/link'
import { monacoOptions, initializeTheme } from '@/lib/monaco'

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
    <div className="h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
      <div className="p-4">
        <Link
          href="/"
          className="inline-block mb-4 px-4 py-2 text-sm font-medium text-amber-300 bg-neutral-800/80 rounded-md hover:bg-neutral-700/80 transition-colors"
        >
          ← Back to Home
        </Link>
      </div>

      <main className="flex-1 px-8 overflow-hidden">
        <div className="h-full max-w-4xl mx-auto flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-amber-300">Create New Script</h1>
              <div className="space-y-2">
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-neutral-800/80 border border-amber-400/10 focus:ring-2 focus:ring-amber-400/20 focus:border-transparent text-amber-300"
                  placeholder="Enter script title..."
                />
                {error && <div className="text-red-400 text-sm">{error}</div>}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={createScript}
                disabled={isSubmitting}
                className="bg-gradient-to-tr from-amber-300 to-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg hover:brightness-110 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Create Script'
                )}
              </button>
            </div>
          </div>

          <div className="bg-zinc-900/90 rounded-lg shadow-2xl overflow-hidden flex-1 border border-amber-400/10 ring-1 ring-amber-400/20 shadow-amber-900/20">
            <div className="w-full h-full relative">
              <Editor
                height="100%"
                defaultLanguage="typescript"
                value={content}
                onChange={value => setContent(value || '')}
                options={monacoOptions}
                beforeMount={initializeTheme}
                theme="gruvboxTheme"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
