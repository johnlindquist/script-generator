'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { STRINGS } from '@/lib/strings'

export default function SyncRepoPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [repoUrl, setRepoUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/sync-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      })

      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || STRINGS.SYNC_REPO.error.unknown)
      }

      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : STRINGS.SYNC_REPO.error.unknown)
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
        <h1 className="text-3xl font-bold text-amber-300 mb-8">{STRINGS.SYNC_REPO.title}</h1>

        <form onSubmit={handleSync} className="space-y-6">
          <div>
            <label htmlFor="repoUrl" className="block text-sm font-medium text-gray-200 mb-2">
              {STRINGS.SYNC_REPO.inputLabel}
            </label>
            <input
              id="repoUrl"
              type="text"
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              placeholder={STRINGS.SYNC_REPO.inputPlaceholder}
              className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-200 placeholder-gray-500"
              required
            />
            <p className="mt-2 text-sm text-gray-400">{STRINGS.SYNC_REPO.description}</p>
          </div>

          {error && (
            <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-black font-medium rounded-lg transition-colors"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                {STRINGS.SYNC_REPO.syncing}
              </>
            ) : (
              STRINGS.SYNC_REPO.syncButton
            )}
          </button>
        </form>
      </div>
    </main>
  )
}
