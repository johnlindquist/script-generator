'use client'

import { useState, useRef, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { Editor } from '@monaco-editor/react'
import ScriptSuggestions from '@/components/ScriptSuggestions'
import { monacoOptions, initializeTheme } from '@/lib/monaco'
import {
  RocketLaunchIcon,
  DocumentCheckIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/solid'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'

interface EditorRef {
  getModel: () => {
    getLineCount: () => number
    getValue: () => string
    setValue: (value: string) => void
  } | null
  revealLine: (line: number) => void
}

interface Props {
  isAuthenticated: boolean
}

const AnimatedText = ({ text }: { text: string }) => {
  return (
    <div className="inline-flex items-center gap-2">
      <span>{text}</span>
      <motion.div className="flex gap-1" initial={{ opacity: 0.5 }} animate={{ opacity: 1 }}>
        {[0, 1, 2].map(index => (
          <motion.span
            key={index}
            className="w-1.5 h-1.5 rounded-full bg-amber-400"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: index * 0.2,
            }}
          />
        ))}
      </motion.div>
    </div>
  )
}

export default function ScriptGenerationClient({ isAuthenticated }: Props) {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationPass, setGenerationPass] = useState<'initial' | 'refining' | null>(null)
  const [generatedScript, setGeneratedScript] = useState<string | null>(null)
  const [editableScript, setEditableScript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<{ count: number; limit: number } | null>(null)
  const editorRef = useRef<EditorRef | null>(null)
  const prevIsGeneratingRef = useRef(isGenerating)
  const suggestionsRef = useRef<{ refreshSuggestions: () => void } | null>(null)

  // Fetch usage on mount and after each generation
  const fetchUsage = async () => {
    if (!isAuthenticated) return
    try {
      const response = await fetch('/api/usage')
      if (response.ok) {
        const data = await response.json()
        setUsage(data)
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error)
    }
  }

  useEffect(() => {
    fetchUsage()
  }, [isAuthenticated])

  const handleEditorDidMount = (editor: EditorRef) => {
    editorRef.current = editor
  }

  // Generate a unique ID for this script generation
  const generateRequestId = () => {
    return crypto.randomUUID()
  }

  // Format the editor content
  const formatEditorContent = () => {
    const model = editorRef.current?.getModel()
    if (model && editableScript) {
      const formatted = editableScript
        .split('\n')
        .map(line => line.trimEnd()) // Remove trailing spaces
        .join('\n')
      model.setValue(formatted)
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!prompt.trim() || isGenerating) return

    if (!isAuthenticated) {
      signIn()
      return
    }

    const requestId = generateRequestId()
    await generateScript(prompt, requestId)
  }

  // Handle keyboard submission
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const requestId = generateRequestId()
      if (!prompt.trim() || isGenerating || prompt.trim().length < 9) return
      if (!isAuthenticated) {
        signIn()
        return
      }
      generateScript(prompt, requestId)
    }
  }

  // Handle script generation
  const generateScript = async (prompt: string, requestId: string) => {
    setIsGenerating(true)
    setError(null)
    setGeneratedScript(null)
    setEditableScript('')
    setGenerationPass('initial')

    try {
      // First pass - generate initial script
      const initialResponse = await fetch('/api/generate-initial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, requestId }),
      })

      if (!initialResponse.ok) {
        const errorData = await initialResponse.json()
        throw new Error(errorData.details || 'Failed to generate initial script')
      }

      const initialReader = initialResponse.body?.getReader()
      if (!initialReader) {
        throw new Error('No reader available')
      }

      let initialBuffer = ''
      let scriptId = ''

      // Read the initial script and extract the script ID
      while (true) {
        const { done, value } = await initialReader.read()
        if (done) break

        const text = new TextDecoder().decode(value)
        initialBuffer += text
        // trim
        initialBuffer = initialBuffer.trim()

        // Check for script ID delimiter
        const idMatch = initialBuffer.match(/__SCRIPT_ID__(.+?)__SCRIPT_ID__/)
        if (idMatch) {
          scriptId = idMatch[1]
          // Remove the ID delimiter from the buffer
          initialBuffer = initialBuffer.replace(/__SCRIPT_ID__.+?__SCRIPT_ID__/, '')
        }

        // Show progress in editor while generating
        setEditableScript(initialBuffer)
      }

      if (!scriptId) {
        throw new Error('Failed to get script ID from initial generation')
      }

      // Second pass - refine and verify the script
      setGenerationPass('refining')
      const refinedResponse = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId }),
      })

      if (!refinedResponse.ok) {
        const errorData = await refinedResponse.json()
        throw new Error(errorData.details || 'Failed to refine script')
      }

      const refinedReader = refinedResponse.body?.getReader()
      if (!refinedReader) {
        throw new Error('No reader available')
      }

      let refinedBuffer = ''
      while (true) {
        const { done, value } = await refinedReader.read()
        if (done) break

        const text = new TextDecoder().decode(value)
        refinedBuffer += text
        // trim
        refinedBuffer = refinedBuffer.trim()
        // Show progress in editor while refining
        setEditableScript(refinedBuffer)
      }

      // Set the final complete text
      setEditableScript(refinedBuffer)
      setGeneratedScript(refinedBuffer)

      // Refresh usage after successful generation
      await fetchUsage()
    } catch (err) {
      console.error('Generation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate script')
    } finally {
      setIsGenerating(false)
      setGenerationPass(null)
    }
  }

  // Handle saving the script
  const handleSave = async () => {
    try {
      const response = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          code: editableScript,
          saved: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save script')
      }

      toast.success('Script saved successfully!')
      // Reset form state after successful save
      setPrompt('')
      setEditableScript('')
      setGeneratedScript(null)
      setError(null)

      // Refresh the page to show the new script
      window.location.reload()
    } catch (err) {
      console.error('Save error:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to save script')
    }
  }

  // Handle save and install
  const handleSaveAndInstall = async () => {
    try {
      // Save the script first
      const response = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          code: editableScript,
          saved: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save script')
      }

      const { id, dashedName } = await response.json()

      // Track the install after successful save
      const installResponse = await fetch('/api/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId: id }),
      })

      if (!installResponse.ok) {
        throw new Error('Failed to track install')
      }

      toast.success('Script saved and installed successfully!')

      // Reset form state
      setPrompt('')
      setEditableScript('')
      setGeneratedScript(null)
      setError(null)

      // Redirect to the install URL - the script is ready since we got the id and dashedName
      const baseUrl =
        typeof window !== 'undefined' ? window.location.origin : 'https://scriptkit.com'
      window.location.href = `/api/new?name=${encodeURIComponent(dashedName || 'script-name-not-found')}&url=${encodeURIComponent(`${baseUrl}/scripts/${id}/raw/${dashedName || 'script'}.ts`)}`
    } catch (err) {
      console.error('Save and install error:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to save and install script')
    }
  }

  // Scroll while generating
  useEffect(() => {
    if (editorRef.current && isGenerating) {
      const model = editorRef.current.getModel()
      if (model) {
        const lineCount = model.getLineCount()
        editorRef.current.revealLine(lineCount)
      }
    }
  }, [editableScript, isGenerating])

  // Final scroll when generation completes
  useEffect(() => {
    if (prevIsGeneratingRef.current && !isGenerating && editorRef.current) {
      const model = editorRef.current.getModel()
      if (model) {
        const lineCount = model.getLineCount()
        editorRef.current.revealLine(lineCount)
        formatEditorContent()
      }
    }
    prevIsGeneratingRef.current = isGenerating
  }, [isGenerating, editableScript])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && generatedScript && !isGenerating) {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [generatedScript, isGenerating])

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold mb-6 text-center min-h-[32px]">
        {isGenerating ? (
          <AnimatedText
            text={
              generationPass === 'initial'
                ? 'Generating Initial Script Idea'
                : 'Refining Script Idea'
            }
          />
        ) : generatedScript ? (
          'Done ✅. Please Make Final Edits and Save'
        ) : (
          'Enter Your Script Idea'
        )}
      </h2>
      {!generatedScript && !isGenerating && (
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="mb-6">
            <textarea
              id="prompt"
              value={prompt}
              onChange={e => isAuthenticated && setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={
                isGenerating || !isAuthenticated || (usage?.count ?? 0) >= (usage?.limit ?? 50)
              }
              maxLength={10000}
              className={`w-full h-32 px-3 py-2 bg-zinc-900/90 text-slate-300 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed ${!isAuthenticated ? 'cursor-pointer' : ''}`}
              placeholder={
                !isAuthenticated
                  ? 'Sign in to start generating scripts!'
                  : usage && usage.count >= usage.limit
                    ? 'Daily generation limit reached. Try again tomorrow!'
                    : 'Example: A script that finds all large files in a directory and shows their sizes in human-readable format'
              }
              required
              onClick={() => !isAuthenticated && signIn()}
            />
            <div className="mt-2 flex justify-between items-center">
              <span
                className={`text-sm ${prompt.trim().length < 15 ? 'text-amber-400' : 'text-slate-400'}`}
              >
                {prompt.trim().length}/10,000 characters (minimum 15)
              </span>
              {isAuthenticated && usage && (
                <span
                  className={`text-sm ${usage.count >= usage.limit ? 'text-red-400' : 'text-slate-400'}`}
                >
                  {usage.count} / {usage.limit} generations used today
                </span>
              )}
            </div>
          </div>

          {!isGenerating && (
            <>
              <button
                type="submit"
                disabled={
                  isGenerating ||
                  prompt.trim().length < 15 ||
                  (usage?.count ?? 0) >= (usage?.limit ?? 50)
                }
                className={`w-1/2 bg-gradient-to-tr from-amber-300 to-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl transition flex items-center justify-center gap-2 mx-auto ${
                  isGenerating ? 'cursor-wait' : !isAuthenticated ? 'cursor-pointer' : ''
                }`}
                onClick={() => !isAuthenticated && signIn()}
              >
                {isGenerating ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : !isAuthenticated ? (
                  <>
                    <RocketLaunchIcon className="w-5 h-5" />
                    Sign in to Generate
                  </>
                ) : usage && usage.count >= usage.limit ? (
                  <>
                    <RocketLaunchIcon className="w-5 h-5" />
                    Daily Limit Reached
                  </>
                ) : (
                  <>
                    <RocketLaunchIcon className="w-5 h-5" />
                    Generate Script
                  </>
                )}
              </button>

              <div className="mt-8 text-center text-sm">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <p className="text-slate-400">Or generate from a suggestion</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isAuthenticated) {
                        signIn()
                        return
                      }
                      suggestionsRef.current?.refreshSuggestions()
                    }}
                    className="text-sm bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 px-2 py-1 rounded-full transition-colors duration-200 flex items-center gap-1"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                  </button>
                </div>
                <ScriptSuggestions
                  ref={suggestionsRef}
                  setPrompt={suggestion => {
                    if (!isAuthenticated) {
                      signIn()
                      return
                    }
                    setPrompt(suggestion)
                    // Generate script immediately after setting the prompt
                    generateScript(suggestion, generateRequestId())
                  }}
                />
              </div>
            </>
          )}
        </form>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-900/20 border border-red-700/50 rounded-lg text-red-400">
          <h3 className="font-semibold mb-2">Error</h3>
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {(isGenerating || generatedScript) && (
        <div className="mt-8">
          <div className="relative mb-2 max-w-4xl mx-auto">
            <div className="bg-zinc-900/90 rounded-lg overflow-hidden border border-amber-400/10 ring-1 ring-amber-400/20 shadow-amber-900/20">
              <div className="w-full h-[600px] relative">
                <Editor
                  height="100%"
                  defaultLanguage="typescript"
                  value={editableScript}
                  onChange={value => isAuthenticated && setEditableScript(value || '')}
                  options={{
                    ...monacoOptions,
                    readOnly: !isAuthenticated,
                    domReadOnly: !isAuthenticated,
                  }}
                  beforeMount={initializeTheme}
                  theme="brillance-black"
                  onMount={handleEditorDidMount}
                />
              </div>
            </div>
            {!isGenerating && (
              <div className="absolute bottom-4 right-4 flex gap-2">
                {isAuthenticated && (
                  <>
                    <button
                      onClick={handleSave}
                      className="bg-gradient-to-tr from-amber-300 to-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition-colors flex items-center gap-2"
                    >
                      <DocumentCheckIcon className="w-5 h-5" />
                      Save Script
                    </button>
                    <button
                      onClick={handleSaveAndInstall}
                      className="bg-gradient-to-tr from-amber-300 to-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition-colors flex items-center gap-2"
                    >
                      <ArrowDownTrayIcon className="w-5 h-5" />
                      Save & Install
                    </button>
                    <button
                      onClick={() => {
                        setPrompt('')
                        setEditableScript('')
                        setGeneratedScript(null)
                        setError(null)
                      }}
                      className="bg-gradient-to-tr from-gray-700 to-gray-800 text-slate-300 px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition-colors flex items-center gap-2"
                    >
                      <ArrowPathIcon className="w-5 h-5" />
                      Start Over
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
