'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { signIn } from 'next-auth/react'
import { Editor } from '@monaco-editor/react'
import { monacoOptions, initializeTheme } from '@/lib/monaco'
import {
  RocketLaunchIcon,
  DocumentCheckIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  SparklesIcon,
} from '@heroicons/react/24/solid'
import { motion } from 'framer-motion'
import { STRINGS } from '@/lib/strings'
import ScriptSuggestions from '@/components/ScriptSuggestions'
import { scriptGenerationMachine } from './ScriptGenerationMachine'
import { useMachine } from '@xstate/react'
import toast from 'react-hot-toast'
import { Tooltip } from '@nextui-org/react'

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
  heading: string
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

const handleUnauthorized = () => {
  toast.error('Session expired. Please sign in again.')

  // Show a second toast after a brief delay
  setTimeout(() => {
    toast.loading('Refreshing page...', { duration: 2000 })
  }, 500)

  // Reload after giving time to read both toasts
  setTimeout(() => {
    window.location.reload()
  }, 2500)
}

export default function ScriptGenerationClient({ isAuthenticated, heading }: Props) {
  const [state, send] = useMachine(scriptGenerationMachine, {
    input: {
      prompt: '',
      editableScript: '',
      generatedScript: null,
      error: null,
      usageCount: 0,
      usageLimit: 0,
      requestId: null,
      isFromSuggestion: false,
      scriptId: null,
      interactionTimestamp: null,
      isFromLucky: false,
      luckyRequestId: null,
      lastRefinementRequestId: null,
    },
  })
  const [streamedText, setStreamedText] = useState('')
  const editorRef = useRef<EditorRef | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Check for forked content on mount
  useEffect(() => {
    const forkedContent = localStorage.getItem('forkedScriptContent')
    if (forkedContent && !state.context.prompt) {
      send({ type: 'SET_PROMPT', prompt: forkedContent })
      localStorage.removeItem('forkedScriptContent')

      // Focus immediately and after a delay to ensure it works
      if (textareaRef.current) {
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight
        textareaRef.current.focus()
      }
      // Try again after a delay
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.scrollTop = textareaRef.current.scrollHeight
          textareaRef.current.focus()
        }
      })
    }
  }, [send, state.context.prompt])

  // Update the editor with streamed text
  useEffect(() => {
    if (streamedText && (state.matches('generatingDraft') || state.matches('generatingFinal'))) {
      send({ type: 'UPDATE_EDITABLE_SCRIPT', script: streamedText })
    }
  }, [streamedText, state.matches])

  // Handle streaming text updates
  const handleStreamedText = useCallback((text: string) => {
    setStreamedText(text)
  }, [])

  // Attach the handler to the state machine
  useEffect(() => {
    // Start streaming if we're in a thinking or generating state
    if (!state.matches('thinkingDraft') && !state.matches('generatingFinal')) {
      return
    }

    const controller = new AbortController()
    const signal = controller.signal

    const fetchWithStreaming = async () => {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')
        const res = await fetch('/api/generate-draft', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Interaction-Timestamp': timestamp,
          },
          body: JSON.stringify({
            prompt: state.context.prompt,
            luckyRequestId: state.context.luckyRequestId,
          }),
        })

        if (res.status === 401) {
          handleUnauthorized()
          return
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to generate draft')
        }

        const reader = res.body?.getReader()
        if (!reader) {
          throw new Error('No reader available')
        }

        try {
          let buffer = ''
          // Transition to streaming state if in thinking state
          if (state.matches('thinkingDraft')) {
            send({ type: 'START_STREAMING_DRAFT' })
          }

          while (true) {
            try {
              const { done, value } = await reader.read()
              if (done) break

              const text = new TextDecoder().decode(value)
              buffer += text

              // Only trim when checking for script ID
              const trimmedBuffer = buffer.trim()
              const idMatch = trimmedBuffer.match(/__SCRIPT_ID__(.+?)__SCRIPT_ID__/)
              if (idMatch) {
                const scriptId = idMatch[1]
                buffer = buffer.replace(/__SCRIPT_ID__.+?__SCRIPT_ID__/, '')
                send({ type: 'SET_SCRIPT_ID', scriptId })
              }

              handleStreamedText(buffer)
            } catch {
              if (signal.aborted) {
                // Clean abort during state transition, not an error
                return
              }
              // If we get a read error but have a buffer, we can still use it
              if (buffer) {
                handleStreamedText(buffer)
              }
              break
            }
          }

          // Only proceed if we have a valid buffer and haven't been aborted
          if (buffer && !signal.aborted) {
            // Make sure we preserve the final buffer
            send({ type: 'UPDATE_EDITABLE_SCRIPT', script: buffer })
          }
        } finally {
          if (!signal.aborted) {
            reader.cancel().catch(() => {})
          }
        }
      } catch (error) {
        console.error('Error generating draft:', error)
        toast.error(error instanceof Error ? error.message : 'Generation failed')
      }
    }

    fetchWithStreaming()

    return () => {
      // Only abort if we're not transitioning between generation phases
      if (state.matches('thinkingDraft') && !state.matches('generatingDraft')) {
        controller.abort()
      }
    }
  }, [
    state.matches,
    state.context.prompt,
    state.context.requestId,
    state.context.scriptId,
    state.context.luckyRequestId,
    handleStreamedText,
  ])

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsage()
    }
  }, [isAuthenticated])

  // Fetch usage on mount and after each generation
  const fetchUsage = async () => {
    if (!isAuthenticated) return

    try {
      const response = await fetch('/api/usage')
      if (response.ok) {
        const data = await response.json()
        send({ type: 'SET_USAGE', count: data.count, limit: data.limit })
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error)
    }
  }

  const handleEditorDidMount = (editor: EditorRef) => {
    editorRef.current = editor
  }

  // Auto-scroll to bottom when new content is streamed
  useEffect(() => {
    console.log('State changed:', {
      state: state.value,
      editableScript: state.context.editableScript,
      timestamp: new Date().toISOString(),
    })
  }, [state])

  useEffect(() => {
    console.log('editableScript changed:', {
      editableScript: state.context.editableScript,
      timestamp: new Date().toISOString(),
    })
    const editor = editorRef.current
    if (editor && (state.matches('generatingDraft') || state.matches('generatingFinal'))) {
      const model = editor.getModel()
      if (model) {
        const lineCount = model.getLineCount()
        editor.revealLine(lineCount)
      }
    }
  }, [state.context.editableScript])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isAuthenticated) {
      signIn()
      return
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')
    send({ type: 'GENERATE_DRAFT', timestamp })
  }

  // Handle keyboard submission
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!state.context.prompt.trim() || state.context.prompt.trim().length < 9) return
      if (!isAuthenticated) {
        signIn()
        return
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')
      send({ type: 'GENERATE_DRAFT', timestamp })
    }
  }

  const isGenerating = state.matches('generatingDraft') || state.matches('generatingFinal')
  const isThinking = state.matches('thinkingDraft')
  const generationPhase = state.matches('thinkingDraft')
    ? 'thinkingDraft'
    : state.matches('generatingDraft')
      ? 'generatingDraft'
      : state.matches('generatingFinal')
        ? 'generatingFinal'
        : null

  useEffect(() => {
    if (
      state.context.isFromSuggestion &&
      state.context.prompt.trim().length >= 15 &&
      isAuthenticated
    ) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')
      send({ type: 'GENERATE_DRAFT', timestamp })
    }
  }, [state.context.isFromSuggestion, state.context.prompt, isAuthenticated])

  const handleFeelingLucky = async () => {
    if (!isAuthenticated) {
      signIn()
      return
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')
      const luckyRequestId = crypto.randomUUID()

      // Clear any existing state
      send({ type: 'SET_ERROR', error: '' })
      send({
        type: 'SET_PROMPT',
        prompt: '', // We'll fill in after we fetch /api/lucky
      })

      const res = await fetch('/api/lucky', {
        headers: {
          'Interaction-Timestamp': timestamp,
        },
      })

      if (res.status === 401) {
        handleUnauthorized()
        return
      }

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get random scripts')
      }

      if (!data.combinedPrompt) {
        throw new Error('Invalid response format')
      }

      // Set the lucky context before generating
      send({ type: 'FROM_SUGGESTION', value: false })
      send({ type: 'UPDATE_EDITABLE_SCRIPT', script: '' })
      send({
        type: 'SET_PROMPT',
        prompt: data.combinedPrompt,
      })

      // Store the lucky request ID in the context
      send({
        type: 'SET_LUCKY_REQUEST',
        requestId: luckyRequestId,
      })

      // Start generation with the timestamp
      send({ type: 'GENERATE_DRAFT', timestamp })
    } catch (err) {
      console.error('Lucky generation failed:', err)
      send({
        type: 'SET_ERROR',
        error: err instanceof Error ? err.message : 'Failed to generate random script',
      })
    }
  }

  return (
    <div className="mb-4">
      <h2 className="text-2xl font-bold mb-6 text-center min-h-[32px]">
        {isGenerating || isThinking ? (
          <AnimatedText
            text={
              generationPhase === 'thinkingDraft'
                ? STRINGS.SCRIPT_GENERATION.headingThinkingDraft
                : generationPhase === 'generatingDraft'
                  ? STRINGS.SCRIPT_GENERATION.headingWhileGenerating
                  : STRINGS.SCRIPT_GENERATION.headingWhileRefining
            }
          />
        ) : state.context.generatedScript ? (
          STRINGS.SCRIPT_GENERATION.headingDone
        ) : (
          heading
        )}
      </h2>
      {!state.context.generatedScript && !isGenerating && !isThinking && (
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <textarea
            ref={textareaRef}
            value={state.context.prompt}
            onChange={e => send({ type: 'SET_PROMPT', prompt: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder={
              !isAuthenticated
                ? STRINGS.SCRIPT_GENERATION.promptPlaceholderSignIn
                : state.context.usageCount === state.context.usageLimit
                  ? STRINGS.SCRIPT_GENERATION.promptPlaceholderLimitReached
                  : STRINGS.SCRIPT_GENERATION.promptPlaceholderDefault
            }
            className="w-full h-32 p-4 bg-black/20 border border-amber-400/20 rounded-lg focus:border-amber-400/40 focus:outline-none resize-none"
            disabled={!isAuthenticated || state.context.usageCount === state.context.usageLimit}
          />

          <div className="flex justify-between items-center mb-8 px-2 opacity-90">
            <span
              className={`text-sm ${state.context.prompt.trim().length < 15 ? 'text-amber-400' : 'text-slate-400'}`}
            >
              {STRINGS.SCRIPT_GENERATION.characterCount.replace(
                '{count}',
                state.context.prompt.trim().length.toString()
              )}
            </span>
            {isAuthenticated ? (
              <span
                className={`text-sm ${state.context.usageCount >= state.context.usageLimit ? 'text-red-400' : 'text-slate-400'}`}
              >
                {STRINGS.SCRIPT_GENERATION.generationUsage
                  .replace('{count}', state.context.usageCount.toString())
                  .replace('{limit}', state.context.usageLimit.toString())}
              </span>
            ) : (
              <span className="text-sm text-slate-400">
                {STRINGS.SCRIPT_GENERATION.generationUsage
                  .replace('{count}', '0')
                  .replace('{limit}', '0')}
              </span>
            )}
          </div>
          <div className="flex justify-center mt-4">
            <Tooltip
              content={!isAuthenticated ? STRINGS.SCRIPT_GENERATION.tooltipSignInToGenerate : ''}
            >
              <button
                type="submit"
                disabled={
                  !isAuthenticated ||
                  state.matches('generatingDraft') ||
                  state.matches('generatingFinal')
                }
                className="flex items-center gap-2 bg-amber-400 text-black px-6 py-2 rounded-lg font-medium hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {state.matches('generatingDraft') || state.matches('generatingFinal') ? (
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                ) : (
                  <RocketLaunchIcon className="w-5 h-5" />
                )}
                Generate
              </button>
            </Tooltip>
            <Tooltip
              content={!isAuthenticated ? STRINGS.SCRIPT_GENERATION.tooltipSignInForLucky : ''}
            >
              <button
                type="button"
                onClick={handleFeelingLucky}
                disabled={
                  !isAuthenticated ||
                  state.matches('generatingDraft') ||
                  state.matches('generatingFinal')
                }
                className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-black font-semibold px-4 py-2 rounded-lg transition-colors ml-4"
              >
                <SparklesIcon className="w-5 h-5" />
                I'm Feeling Lucky
              </button>
            </Tooltip>
          </div>
        </form>
      )}

      {isAuthenticated && !state.context.generatedScript && !isGenerating && !isThinking && (
        <div className="pt-4">
          <h3 className="text-lg my-4 text-center">
            {STRINGS.SCRIPT_GENERATION.scriptSuggestionsHeading}
          </h3>
          {isAuthenticated && (
            <ScriptSuggestions
              setPrompt={prompt => {
                send({ type: 'SET_PROMPT', prompt })
                send({ type: 'FROM_SUGGESTION', value: true })
              }}
              setIsFromSuggestion={() => {}}
              className="mb-4"
            />
          )}
        </div>
      )}

      {state.context.error && (
        <div className="mt-4 p-4 bg-red-900/20 border border-red-700/50 rounded-lg text-red-400">
          <h3 className="font-semibold mb-2">{STRINGS.SCRIPT_GENERATION.errorHeading}</h3>
          <p className="text-red-400">{state.context.error}</p>
        </div>
      )}

      {(isGenerating || isThinking || state.context.generatedScript) && (
        <div className="mt-8">
          <div className="relative mb-2 max-w-4xl mx-auto">
            <div className="bg-zinc-900/90 rounded-lg overflow-hidden border border-amber-400/10 ring-1 ring-amber-400/20 shadow-amber-900/20">
              <div className="w-full h-[600px] relative">
                <Editor
                  height="100%"
                  defaultLanguage="typescript"
                  value={state.context.editableScript}
                  onChange={value =>
                    isAuthenticated &&
                    state.matches('complete') &&
                    send({ type: 'UPDATE_EDITABLE_SCRIPT', script: value || '' })
                  }
                  options={{
                    ...monacoOptions,
                    readOnly: !isAuthenticated || !state.matches('complete'),
                    domReadOnly: !isAuthenticated || !state.matches('complete'),
                  }}
                  onMount={handleEditorDidMount}
                  beforeMount={initializeTheme}
                  theme="brillance-black"
                />
              </div>
            </div>
            {state.matches('complete') && (
              <div className="absolute bottom-4 right-4 flex gap-2">
                {isAuthenticated && (
                  <>
                    <button
                      onClick={() => send({ type: 'SAVE_SCRIPT' })}
                      className="bg-gradient-to-tr from-amber-300 to-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition-colors flex items-center gap-2"
                    >
                      <DocumentCheckIcon className="w-5 h-5" />
                      {STRINGS.SCRIPT_GENERATION.saveScript}
                    </button>
                    <button
                      onClick={() => send({ type: 'SAVE_AND_INSTALL' })}
                      className="bg-gradient-to-tr from-amber-300 to-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition-colors flex items-center gap-2"
                    >
                      <ArrowDownTrayIcon className="w-5 h-5" />
                      {STRINGS.SCRIPT_GENERATION.saveAndInstall}
                    </button>
                    <button
                      onClick={() => send({ type: 'RESET' })}
                      className="bg-gradient-to-tr from-gray-700 to-gray-800 text-slate-300 px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition-colors flex items-center gap-2"
                    >
                      <ArrowPathIcon className="w-5 h-5" />
                      {STRINGS.SCRIPT_GENERATION.startOver}
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
