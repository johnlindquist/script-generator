'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { STRINGS } from '@/lib/strings'

const PLACEHOLDER = `[
  {
    "name": "script-name",
    "description": "script description",
    "content": "\`\`\`typescript\\nimport \\"@johnlindquist/kit\\"\\n// Your script code here\\n\`\`\`",
    "author": "John Doe",
    "user": "johndoe",
    "github": "https://github.com/johndoe",
    "twitter": "@johndoe"
  }
]`

export default function ImportScriptsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Parse JSON array
      const scripts = JSON.parse(content)
      if (!Array.isArray(scripts)) {
        throw new Error(STRINGS.IMPORT_SCRIPTS.error.invalidJson)
      }

      const res = await fetch('/api/import-scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: content,
      })

      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || STRINGS.IMPORT_SCRIPTS.error.unknown)
      }

      const data = await res.json()
      console.log('Import successful:', data)
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : STRINGS.IMPORT_SCRIPTS.error.unknown)
    } finally {
      setLoading(false)
    }
  }

  if (!session?.user) {
    router.push('/api/auth/signin')
    return null
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-amber-300 mb-8">{STRINGS.IMPORT_SCRIPTS.title}</h1>

        <form onSubmit={handleImport} className="space-y-6">
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-200 mb-2">
              {STRINGS.IMPORT_SCRIPTS.inputLabel}
            </label>
            <textarea
              id="content"
              value={content}
              onChange={e => setContent((e.target as HTMLInputElement).value)}
              placeholder={PLACEHOLDER}
              className="w-full h-96 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-200 placeholder-gray-500 font-mono"
              required
            />
            <p className="mt-2 text-sm text-gray-400">{STRINGS.IMPORT_SCRIPTS.description}</p>
          </div>

          {error && (
            <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground disabled:opacity-50 font-medium rounded transition-colors"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                {STRINGS.IMPORT_SCRIPTS.importing}
              </>
            ) : (
              STRINGS.IMPORT_SCRIPTS.importButton
            )}
          </button>
        </form>
      </div>
    </main>
  )
}
