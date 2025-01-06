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
import type { Suggestion } from '@/lib/getRandomSuggestions'
import { fetchUsage, generateLucky, generateDraftWithStream } from '@/lib/apiService'
import { generateFinalWithStream } from '@/lib/apiStreamingServices'

interface EditorRef {
  getModel: () => {
    getLineCount: () => number
    getValue: () => string
    setValue: (value: string) => void
    getFullModelRange: () => {
      startLineNumber: number
      startColumn: number
      endLineNumber: number
      endColumn: number
    }
    applyEdits: (
      edits: {
        range: {
          startLineNumber: number
          startColumn: number
          endLineNumber: number
          endColumn: number
        }
        text: string
      }[]
    ) => void
  } | null
  revealLine: (line: number) => void
}

interface Props {
  isAuthenticated: boolean
  heading: string
  suggestions: Suggestion[]
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

export default function ScriptGenerationClient({ isAuthenticated, heading, suggestions }: Props) {
  const [state, send, service] = useMachine(scriptGenerationMachine, {
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

  // Add state transition observer
  useEffect(() => {
    const subscription = service.subscribe(snapshot => {
      console.log('[XSTATE] State transition:', {
        state: snapshot.value,
        context: {
          prompt: snapshot.context.prompt,
          scriptId: snapshot.context.scriptId,
          requestId: snapshot.context.requestId,
          luckyRequestId: snapshot.context.luckyRequestId,
          isFromLucky: snapshot.context.isFromLucky,
          isFromSuggestion: snapshot.context.isFromSuggestion,
          error: snapshot.context.error,
          timestamp: new Date().toISOString(),
        },
      })
    })

    return () => subscription.unsubscribe()
  }, [service])

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
    console.log('handleStreamedText called with text length:', text.length)
    const editor = editorRef.current
    const model = editor?.getModel()

    if (model) {
      const currentContent = model.getValue()
      if (text.length > currentContent.length) {
        // Get the new content to append
        const newContent = text.slice(currentContent.length)

        // Create an edit operation to append the new content
        const range = model.getFullModelRange()
        model.applyEdits([
          {
            range: {
              startLineNumber: range.endLineNumber,
              startColumn: range.endColumn,
              endLineNumber: range.endLineNumber,
              endColumn: range.endColumn,
            },
            text: newContent,
          },
        ])
      }
    } else {
      // Fallback to setting the entire content if model isn't available
      setStreamedText(text)
    }
  }, [])

  // Handle draft generation streaming
  useEffect(() => {
    // Debug logging
    console.log('===========================')
    console.log('Draft useEffect TRIGGERED!')
    console.log('Current state:', {
      isThinkingDraft: state.matches('thinkingDraft'),
      isGeneratingFinal: state.matches('generatingFinal'),
      prompt: state.context.prompt,
      requestId: state.context.requestId,
      scriptId: state.context.scriptId,
      luckyRequestId: state.context.luckyRequestId,
      timestamp: new Date().toISOString(),
    })
    console.log('===========================')

    if (!state.matches('thinkingDraft')) {
      console.log('Not in thinkingDraft state, returning early')
      return
    }

    const controller = new AbortController()
    const signal = controller.signal

    const startStreaming = async () => {
      console.log('>> Starting generateDraftWithStream call <<', {
        prompt: state.context.prompt,
        luckyRequestId: state.context.luckyRequestId,
        timestamp: new Date().toISOString(),
      })

      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')

        await generateDraftWithStream(
          state.context.prompt,
          state.context.luckyRequestId,
          timestamp,
          signal,
          {
            onStartStreaming: () => {
              console.log('onStartStreaming callback invoked')
              if (state.matches('thinkingDraft')) {
                console.log('Transitioning to START_STREAMING_DRAFT')
                send({ type: 'START_STREAMING_DRAFT' })
              }
            },
            onScriptId: scriptId => {
              console.log('onScriptId callback invoked with:', scriptId)
              send({ type: 'SET_SCRIPT_ID', scriptId })
            },
            onChunk: text => {
              console.log('onChunk callback invoked with length:', text.length)
              handleStreamedText(text)
              send({ type: 'UPDATE_EDITABLE_SCRIPT', script: text })
            },
            onError: error => {
              console.error('onError callback invoked:', error)
              if (error.message === 'UNAUTHORIZED') {
                handleUnauthorized()
                return
              }
              toast.error(error.message)
            },
          }
        )
        console.log('>> Completed generateDraftWithStream call successfully <<')
      } catch (err) {
        console.error('generateDraftWithStream threw an exception:', err)
      }
    }

    startStreaming()

    return () => {
      console.log('Cleaning up draft streaming effect - aborting controller')
      controller.abort()
    }
  }, [
    state.context.prompt,
    state.context.requestId,
    state.context.scriptId,
    state.context.luckyRequestId,
    handleStreamedText,
    state.matches,
    send,
  ])

  // Effect for final generation streaming
  useEffect(() => {
    let isMounted = true
    let isStreaming = false

    const startStreaming = async () => {
      if (!state.matches('generatingFinal') || !state.context.scriptId) {
        return
      }

      if (isStreaming) {
        console.log('Already streaming final, skipping...')
        return
      }

      console.log('Final useEffect TRIGGERED!')
      console.log('Current state:', {
        isThinkingDraft: state.matches('thinkingDraft'),
        isGeneratingFinal: state.matches('generatingFinal'),
        prompt: state.context.prompt,
        requestId: state.context.requestId,
        scriptId: state.context.scriptId,
        editableScript: state.context.editableScript,
      })

      console.log('===========================')

      try {
        isStreaming = true

        // Clear the editor before starting final generation
        const editor = editorRef.current
        const model = editor?.getModel()
        if (model) {
          model.setValue('')
          setStreamedText('')
        }

        await generateFinalWithStream(
          {
            prompt: state.context.prompt,
            requestId: state.context.requestId,
            luckyRequestId: state.context.luckyRequestId,
            interactionTimestamp: new Date().toISOString(),
            scriptId: state.context.scriptId,
            editableScript: state.context.editableScript || '',
          },
          {
            onStartStreaming: () => {
              if (!isMounted) return
              console.log('Started streaming final')
            },
            onChunk: (text: string) => {
              if (!isMounted) return
              console.log('onChunk callback invoked for final with length:', text.length)
              handleStreamedText(text)
            },
            onError: (error: { message: string }) => {
              if (!isMounted) return
              console.log('onError callback invoked for final:', error)
              send({ type: 'SET_ERROR', error: error.message })
            },
          }
        )

        if (isMounted) {
          console.log('>> Completed generateFinalWithStream call successfully <<')
        }
      } catch (error) {
        if (!isMounted) return
        console.log('generateFinalWithStream threw an exception:', error)
      } finally {
        isStreaming = false
      }
    }

    startStreaming()

    return () => {
      console.log('Cleaning up final streaming effect')
      isMounted = false
      isStreaming = false
    }
  }, [state.matches, state.context.scriptId, handleStreamedText, send])

  // Fetch usage on mount and after each generation
  const fetchUsageData = async () => {
    if (!isAuthenticated) return

    try {
      const data = await fetchUsage()
      send({ type: 'SET_USAGE', count: data.count, limit: data.limit })
    } catch (error) {
      console.error('Failed to fetch usage:', error)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsageData()
    }
  }, [isAuthenticated])

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
    console.log('=== handleFeelingLucky called ===')
    if (!isAuthenticated) {
      console.log('User not authenticated, redirecting to sign in')
      signIn()
      return
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')
      console.log('Starting lucky generation with timestamp:', timestamp)

      // Clear any existing state
      console.log('Clearing existing state...')
      send({ type: 'SET_ERROR', error: '' })
      send({
        type: 'SET_PROMPT',
        prompt: '', // We'll fill in after we fetch /api/lucky
      })

      console.log('Fetching lucky prompt...')
      const data = await generateLucky(timestamp)
      console.log('Lucky data received:', {
        combinedPrompt: data.combinedPrompt,
        requestId: data.requestId,
        timestamp,
      })

      // Set the lucky context before generating
      console.log('Setting up lucky context...')
      send({ type: 'FROM_SUGGESTION', value: false })
      send({ type: 'UPDATE_EDITABLE_SCRIPT', script: '' })
      send({
        type: 'SET_PROMPT',
        prompt: data.combinedPrompt,
      })

      // Store the lucky request ID in the context
      console.log('Setting lucky request ID:', data.requestId)
      send({
        type: 'SET_LUCKY_REQUEST',
        requestId: data.requestId,
      })

      // Now do the standard "GENERATE_DRAFT" call with the same timestamp
      console.log('Dispatching GENERATE_DRAFT with timestamp:', timestamp)
      send({ type: 'GENERATE_DRAFT', timestamp })
    } catch (err) {
      console.error('Lucky generation failed:', err)
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        handleUnauthorized()
        return
      }
      send({
        type: 'SET_ERROR',
        error: err instanceof Error ? err.message : 'Failed to generate random script',
      })
    }
  }

  return (
    <div className="pb-4">
      <h2 className="text-2xl font-bold pt-6 mb-6 text-center min-h-[32px]">
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
        <form
          onSubmit={handleSubmit}
          className={`max-w-2xl mx-auto ${isAuthenticated ? '' : 'pb-4'}`}
        >
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
            className="w-full h-32 p-4 bg-black/75 border border-amber-300/50 rounded-lg focus:border-amber-400/40 focus:outline-none resize-none shadow-amber-300/10 shadow-sm"
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
          <ScriptSuggestions
            setPrompt={prompt => {
              send({ type: 'SET_PROMPT', prompt })
              send({ type: 'FROM_SUGGESTION', value: true })
            }}
            setIsFromSuggestion={() => {}}
            className="mb-4"
            suggestions={suggestions}
          />
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
