'use client'

import { useEffect, useState, use } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { Editor } from '@monaco-editor/react'
import debounce from 'lodash.debounce'
import { monacoOptions, initializeTheme } from '@/lib/monaco'

interface ScriptPageProps {
  params: Promise<{ scriptId: string }>
}

interface Script {
  id: string
  content: string
  title?: string
  owner: {
    id: string
    name?: string
    email?: string
    username?: string
  }
  createdAt: string
  updatedAt: string
}

export default function ScriptPage({ params }: ScriptPageProps) {
  const { scriptId } = use(params)
  const { data: session } = useSession()
  const [script, setScript] = useState<Script | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const isOwner = session?.user?.id === script?.owner?.id

  useEffect(() => {
    const fetchScript = async () => {
      console.log('Fetching script with ID:', scriptId)
      try {
        const response = await fetch(`/api/scripts/${scriptId}`)
        console.log('Response status:', response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Error response:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
          })
          throw new Error(`Failed to fetch script: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        console.log('Successfully fetched script:', data)
        setScript(data)
        setContent(data.content)
        setError(null)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        console.error('Error fetching script:', {
          error,
          message: errorMessage,
          scriptId: scriptId,
        })
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchScript()
  }, [scriptId])

  const saveScript = async (updatedContent: string) => {
    if (!script || saving) return

    setSaving(true)
    try {
      const response = await fetch(`/api/scripts/${scriptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: updatedContent }),
      })

      if (!response.ok) {
        throw new Error('Failed to save script')
      }

      toast.success('Script saved')
    } catch (error) {
      console.error('Error saving script:', error)
      toast.error('Failed to save script')
    } finally {
      setSaving(false)
    }
  }

  // Debounced save function
  const debouncedSave = debounce(saveScript, 1000)

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel()
    }
  }, [debouncedSave])

  const handleEditorChange = (value: string | undefined) => {
    const newContent = value || ''
    setContent(newContent)
    debouncedSave(newContent)
  }

  const handleShare = async () => {
    const url = window.location.href

    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard!')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to copy'
      console.error('Error copying to clipboard:', {
        error,
        message: errorMessage,
        url,
      })
      toast.error(errorMessage)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-800 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-neutral-800 rounded w-1/3 mb-4"></div>
          <div className="h-40 bg-neutral-800 rounded mb-4"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-red-400">Error</h1>
        <p className="mt-2 text-slate-300">{error}</p>
      </div>
    )
  }

  if (!script) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-red-400">Script not found</h1>
        <p className="mt-2 text-slate-300">The requested script could not be found.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <Link
        href="/"
        className="inline-block mb-4 px-4 py-2 text-sm font-medium text-amber-300 bg-neutral-800/80 rounded-md hover:bg-neutral-700/80 transition-colors"
      >
        ← Back to Home
      </Link>
      <main className="container mx-auto px-8 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-amber-300">{script.title}</h1>
              <p className="text-slate-400">
                by {script.owner?.username || 'Anonymous'} •{' '}
                {new Date(script.createdAt).toLocaleDateString()}
                {!isOwner && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-400/10 text-amber-300">
                    Read Only
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              {isOwner && (
                <button
                  onClick={() => saveScript(content)}
                  disabled={saving}
                  className="bg-gradient-to-tr from-amber-300 to-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg hover:brightness-110 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
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
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h-2v5.586l-1.293-1.293z" />
                        <path d="M3 3a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V3zm2-1a1 1 0 00-1 1v14a1 1 0 001 1h10a1 1 0 001-1V3a1 1 0 00-1-1H5z" />
                      </svg>
                      Save
                    </>
                  )}
                </button>
              )}
              <button
                onClick={handleShare}
                className="bg-gradient-to-tr from-amber-300 to-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg hover:brightness-110 transition-colors flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
                Copy
              </button>
            </div>
          </div>

          <div className="bg-zinc-900/90 rounded-lg shadow-2xl overflow-hidden">
            <div className="w-full h-[calc(100vh-4rem)] relative">
              <Editor
                height="100%"
                defaultLanguage="typescript"
                value={content}
                onChange={isOwner ? handleEditorChange : undefined}
                options={{
                  ...monacoOptions,
                  readOnly: !isOwner,
                  domReadOnly: !isOwner,
                }}
                beforeMount={initializeTheme}
                theme="brillance-black"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
