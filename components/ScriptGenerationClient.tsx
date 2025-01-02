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
  const [state, send] = useMachine(scriptGenerationMachine, {
    input: {
      prompt: '',
      requestId: null,
      scriptId: null,
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
    if (
      streamedText &&
      (state.matches('generatingInitial') || state.matches('generatingRefined'))
    ) {
      send({ type: 'UPDATE_EDITABLE_SCRIPT', script: streamedText })
    }
  }, [streamedText, state.matches])

  // Handle streaming text updates
  const handleStreamedText = useCallback((text: string) => {
    setStreamedText(text)
  }, [])

  // Attach the handler to the state machine
  useEffect(() => {
    // Only start streaming if we're in a thinking state
    if (!state.matches('thinkingInitial') && !state.matches('thinkingRefined')) {
      return
    }

    const controller = new AbortController()
    const signal = controller.signal

    const fetchWithStreaming = async () => {
      try {
        const url = state.matches('thinkingInitial') ? '/api/generate-initial' : '/api/generate'
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: state.context.prompt,
            requestId: state.context.requestId,
            scriptId: state.context.scriptId,
          }),
          signal,
        })

        if (!response.ok) {
          const errorData = await response.json()
          const errorMessage =
            response.status === 429
              ? 'Rate limit exceeded. Please wait a moment before trying again.'
              : errorData.details || 'Failed to generate script'
          throw new Error(errorMessage)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('No reader available')
        }

        try {
          let buffer = ''
          // Transition to streaming state
          send({
            type: state.matches('thinkingInitial')
              ? 'START_STREAMING_INITIAL'
              : 'START_STREAMING_REFINED',
          })

          while (true) {
            try {
              const { done, value } = await reader.read()
              if (done) break

              const text = new TextDecoder().decode(value)
              buffer += text
              buffer = buffer.trim()

              const idMatch = buffer.match(/__SCRIPT_ID__(.+?)__SCRIPT_ID__/)
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
        if (!signal.aborted) {
          const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
          // First cancel the generation to go back to idle
          send({ type: 'CANCEL_GENERATION' })
          // Then set the error message
          send({ type: 'SET_ERROR', error: errorMessage })
        }
      }
    }

    fetchWithStreaming()

    return () => {
      // Only abort if we're not transitioning between generation phases
      if (
        (state.matches('thinkingInitial') && !state.matches('generatingInitial')) ||
        (state.matches('thinkingRefined') && !state.matches('generatingRefined'))
      ) {
        controller.abort()
      }
    }
  }, [
    state.matches,
    state.context.prompt,
    state.context.requestId,
    state.context.scriptId,
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
    if (editor && (state.matches('generatingInitial') || state.matches('generatingRefined'))) {
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
    if (!state.context.prompt.trim() || !isAuthenticated) {
      if (!isAuthenticated) signIn()
      return
    }

    send({ type: 'GENERATE_INITIAL' })
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
      send({ type: 'GENERATE_INITIAL' })
    }
  }

  const isGenerating = state.matches('generatingInitial') || state.matches('generatingRefined')
  const isThinking = state.matches('thinkingInitial') || state.matches('thinkingRefined')
  const generationPhase = state.matches('thinkingInitial')
    ? 'thinkingInitial'
    : state.matches('generatingInitial')
      ? 'generatingInitial'
      : state.matches('thinkingRefined')
        ? 'thinkingRefined'
        : state.matches('generatingRefined')
          ? 'generatingRefined'
          : null

  useEffect(() => {
    if (
      state.context.isFromSuggestion &&
      state.context.prompt.trim().length >= 15 &&
      isAuthenticated
    ) {
      send({ type: 'GENERATE_INITIAL' })
    }
  }, [state.context.isFromSuggestion, state.context.prompt, isAuthenticated])

  const handleFeelingLucky = async () => {
    if (!isAuthenticated) {
      signIn()
      return
    }

    try {
      const res = await fetch('/api/lucky')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get random scripts')
      }

      if (!data.combinedPrompt) {
        throw new Error('Invalid response format')
      }

      // Clear any existing error and state
      send({ type: 'RESET' })
      send({ type: 'SET_ERROR', error: '' })

      // Set the prompt and generate
      send({ type: 'SET_PROMPT', prompt: data.combinedPrompt })
      send({ type: 'GENERATE_INITIAL' })
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
              generationPhase === 'thinkingInitial'
                ? STRINGS.SCRIPT_GENERATION.headingThinkingInitial
                : generationPhase === 'generatingInitial'
                  ? STRINGS.SCRIPT_GENERATION.headingWhileGenerating
                  : generationPhase === 'thinkingRefined'
                    ? STRINGS.SCRIPT_GENERATION.headingThinkingRefined
                    : STRINGS.SCRIPT_GENERATION.headingWhileRefining
            }
          />
        ) : state.context.generatedScript ? (
          STRINGS.SCRIPT_GENERATION.headingDone
        ) : (
          STRINGS.SCRIPT_GENERATION.headingDefault
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
            <button
              type="submit"
              disabled={
                !isAuthenticated ||
                state.matches('generatingInitial') ||
                state.matches('generatingRefined')
              }
              className="flex items-center gap-2 bg-amber-400 text-black px-6 py-2 rounded-lg font-medium hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {state.matches('generatingInitial') || state.matches('generatingRefined') ? (
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
              ) : (
                <RocketLaunchIcon className="w-5 h-5" />
              )}
              Generate
            </button>
            <button
              type="button"
              onClick={handleFeelingLucky}
              disabled={
                !isAuthenticated ||
                state.matches('generatingInitial') ||
                state.matches('generatingRefined')
              }
              className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-black font-semibold px-4 py-2 rounded-lg transition-colors ml-4"
            >
              <SparklesIcon className="w-5 h-5" />
              I'm Feeling Lucky
            </button>
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
                    state.matches('done') &&
                    send({ type: 'UPDATE_EDITABLE_SCRIPT', script: value || '' })
                  }
                  options={{
                    ...monacoOptions,
                    readOnly: !isAuthenticated || !state.matches('done'),
                    domReadOnly: !isAuthenticated || !state.matches('done'),
                  }}
                  onMount={handleEditorDidMount}
                  beforeMount={initializeTheme}
                  theme="brillance-black"
                />
              </div>
            </div>
            {state.matches('done') && (
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
