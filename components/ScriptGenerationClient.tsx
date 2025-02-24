'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { signIn } from 'next-auth/react'
import { Editor } from '@monaco-editor/react'
import { monacoOptions, initializeTheme } from '@/lib/monaco'
import { logInteraction } from '@/lib/interaction-logger'
import {
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
import type { Suggestion } from '@/lib/getRandomSuggestions'
import { fetchUsage, generateLucky, generateDraftWithStream } from '@/lib/apiService'
import { generateFinalWithStream } from '@/lib/apiStreamingServices'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { FaGithub } from 'react-icons/fa'
import { ArrowUp } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Loader2 } from 'lucide-react'

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
            className="w-1.5 h-1.5 rounded-full bg-primary"
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
      isTransitioningToFinal: false,
    },
  })

  // Add refs to track generation state
  const finalGenerationStartedRef = useRef(false)
  const isStreamingRef = useRef(false)

  // Reset the ref when leaving generatingFinal state
  useEffect(() => {
    if (state.context.interactionTimestamp) {
      logInteraction(state.context.interactionTimestamp, 'client', 'State matches changed', {
        isGeneratingFinal: state.matches('generatingFinal'),
        wasGeneratingStarted: finalGenerationStartedRef.current,
        timestamp: new Date().toISOString(),
      }).catch(console.error)
    }

    if (!state.matches('generatingFinal')) {
      if (state.context.interactionTimestamp) {
        logInteraction(
          state.context.interactionTimestamp,
          'client',
          'Resetting final generation ref',
          {
            previousValue: finalGenerationStartedRef.current,
            newState: state.value,
            timestamp: new Date().toISOString(),
          }
        ).catch(console.error)
      }
      finalGenerationStartedRef.current = false
    }
  }, [state.matches, state.context.interactionTimestamp])

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
  const headingRef = useRef<HTMLHeadingElement>(null)

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
        // Use the timestamp from context instead of generating a new one
        const timestamp =
          state.context.interactionTimestamp ||
          new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')

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

    // Log what triggered this effect
    if (state.context.interactionTimestamp) {
      logInteraction(
        state.context.interactionTimestamp,
        'client',
        'Final generation useEffect triggered',
        {
          stateValue: state.value,
          scriptId: state.context.scriptId,
          isStreaming: isStreamingRef.current,
          hasStarted: finalGenerationStartedRef.current,
          matches: {
            generatingFinal: state.matches('generatingFinal'),
            complete: state.matches('complete'),
            idle: state.matches('idle'),
          },
          timestamp: new Date().toISOString(),
        }
      ).catch(console.error)
    }

    const startStreaming = async () => {
      // Log the guard check
      if (state.context.interactionTimestamp) {
        logInteraction(
          state.context.interactionTimestamp,
          'client',
          'Checking final generation guards',
          {
            isGeneratingFinal: state.matches('generatingFinal'),
            hasScriptId: Boolean(state.context.scriptId),
            hasStarted: finalGenerationStartedRef.current,
            isStreaming: isStreamingRef.current,
            timestamp: new Date().toISOString(),
          }
        ).catch(console.error)
      }

      // Only proceed if we're in the generatingFinal state and have a scriptId
      if (
        !state.matches('generatingFinal') ||
        !state.context.scriptId ||
        finalGenerationStartedRef.current
      ) {
        if (state.context.interactionTimestamp) {
          logInteraction(
            state.context.interactionTimestamp,
            'client',
            'Guards prevented final generation',
            {
              reason: !state.matches('generatingFinal')
                ? 'not in generatingFinal'
                : !state.context.scriptId
                  ? 'no scriptId'
                  : 'already started',
              isStreaming: isStreamingRef.current,
              timestamp: new Date().toISOString(),
            }
          ).catch(console.error)
        }
        return
      }

      if (isStreamingRef.current) {
        if (state.context.interactionTimestamp) {
          logInteraction(
            state.context.interactionTimestamp,
            'client',
            'Skipped streaming because already in progress',
            {
              scriptId: state.context.scriptId,
              timestamp: new Date().toISOString(),
            }
          ).catch(console.error)
        }
        return
      }

      if (state.context.interactionTimestamp) {
        logInteraction(state.context.interactionTimestamp, 'client', 'Starting final generation', {
          scriptId: state.context.scriptId,
          hasStarted: finalGenerationStartedRef.current,
          isStreaming: isStreamingRef.current,
          timestamp: new Date().toISOString(),
        }).catch(console.error)
      }

      finalGenerationStartedRef.current = true
      isStreamingRef.current = true

      try {
        // Clear the editor before starting final generation
        const editor = editorRef.current
        const model = editor?.getModel()
        if (model) {
          model.setValue('')
          setStreamedText('')
        }

        if (state.context.interactionTimestamp) {
          logInteraction(
            state.context.interactionTimestamp,
            'client',
            'Calling generateFinalWithStream',
            {
              scriptId: state.context.scriptId,
              requestId: state.context.requestId,
              isStreaming: isStreamingRef.current,
              timestamp: new Date().toISOString(),
            }
          ).catch(console.error)
        }

        await generateFinalWithStream(
          {
            prompt: state.context.prompt,
            requestId: state.context.requestId,
            luckyRequestId: state.context.luckyRequestId,
            interactionTimestamp: state.context.interactionTimestamp || new Date().toISOString(),
            scriptId: state.context.scriptId,
            editableScript: state.context.editableScript || '',
          },
          {
            onStartStreaming: () => {
              if (!isMounted) return
              if (state.context.interactionTimestamp) {
                logInteraction(
                  state.context.interactionTimestamp,
                  'client',
                  'Final stream started',
                  {
                    scriptId: state.context.scriptId,
                    isStreaming: isStreamingRef.current,
                    timestamp: new Date().toISOString(),
                  }
                ).catch(console.error)
              }
            },
            onChunk: (text: string) => {
              if (!isMounted) return
              handleStreamedText(text)
            },
            onError: (error: { message: string }) => {
              if (!isMounted) return
              if (state.context.interactionTimestamp) {
                logInteraction(state.context.interactionTimestamp, 'client', 'Final stream error', {
                  error: error.message,
                  scriptId: state.context.scriptId,
                  isStreaming: isStreamingRef.current,
                  timestamp: new Date().toISOString(),
                }).catch(console.error)
              }
              send({ type: 'SET_ERROR', error: error.message })
            },
          }
        )

        if (isMounted) {
          if (state.context.interactionTimestamp) {
            logInteraction(state.context.interactionTimestamp, 'client', 'Final stream completed', {
              scriptId: state.context.scriptId,
              isStreaming: isStreamingRef.current,
              timestamp: new Date().toISOString(),
            }).catch(console.error)
          }
          // Transition to complete state
          send({ type: 'START_STREAMING_FINAL' })
        }
      } catch (error) {
        if (!isMounted) return
        if (state.context.interactionTimestamp) {
          logInteraction(
            state.context.interactionTimestamp,
            'client',
            'Final generation threw error',
            {
              error: error instanceof Error ? error.message : 'Unknown error',
              scriptId: state.context.scriptId,
              isStreaming: isStreamingRef.current,
              timestamp: new Date().toISOString(),
            }
          ).catch(console.error)
        }
      } finally {
        isStreamingRef.current = false
      }
    }

    startStreaming()

    return () => {
      if (state.context.interactionTimestamp) {
        logInteraction(
          state.context.interactionTimestamp,
          'client',
          'Final generation useEffect cleanup',
          {
            scriptId: state.context.scriptId,
            isStreaming: isStreamingRef.current,
            hasStarted: finalGenerationStartedRef.current,
            timestamp: new Date().toISOString(),
          }
        ).catch(console.error)
      }
      isMounted = false
      // Don't reset isStreamingRef here, let it persist across cleanups
    }
  }, [state.value, state.context.scriptId])

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

  const [isSignInModalShowing, setShowSignInModal] = useState(false)

  const showSignInModal = () => {
    // Save the current prompt to localStorage before showing sign in modal
    localStorage.setItem('pendingPrompt', state.context.prompt)
    setShowSignInModal(true)
  }

  // Check for pending prompt on mount
  useEffect(() => {
    const pendingPrompt = localStorage.getItem('pendingPrompt')
    if (pendingPrompt && isAuthenticated) {
      send({ type: 'SET_PROMPT', prompt: pendingPrompt })
      localStorage.removeItem('pendingPrompt')
    }
  }, [isAuthenticated, send])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // if less than 15 characters, throw error
    if (!state.context.prompt.trim() || state.context.prompt.trim().length < 15) {
      send({ type: 'SET_ERROR', error: 'Please provide a prompt with at least 15 characters' })
      return
    }

    if (!isAuthenticated) {
      showSignInModal()
      // signIn()
      return
    }

    // Generate a single timestamp for the entire interaction chain
    const interactionTimestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')
    send({ type: 'GENERATE_DRAFT', timestamp: interactionTimestamp })
  }

  // Handle keyboard submission
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!state.context.prompt.trim() || state.context.prompt.trim().length < 9) return
      if (!isAuthenticated) {
        showSignInModal()
        // signIn()
        return
      }
      // Use the same timestamp from handleSubmit if it exists
      const interactionTimestamp =
        state.context.interactionTimestamp ||
        new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')
      send({ type: 'GENERATE_DRAFT', timestamp: interactionTimestamp })
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
      // Use the existing timestamp if available
      const interactionTimestamp =
        state.context.interactionTimestamp ||
        new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')
      send({ type: 'GENERATE_DRAFT', timestamp: interactionTimestamp })
    }
  }, [state.context.isFromSuggestion, state.context.prompt, isAuthenticated])

  const handleFeelingLucky = async () => {
    console.log('=== handleFeelingLucky called ===')
    if (!isAuthenticated) {
      console.log('User not authenticated, redirecting to sign in')
      showSignInModal()
      // signIn()
      return
    }

    try {
      // Generate a single timestamp for the entire lucky interaction chain
      const interactionTimestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')
      console.log('Starting lucky generation with timestamp:', interactionTimestamp)

      // Clear any existing state
      console.log('Clearing existing state...')
      send({ type: 'SET_ERROR', error: '' })
      send({
        type: 'SET_PROMPT',
        prompt: '', // We'll fill in after we fetch /api/lucky
      })

      console.log('Fetching lucky prompt...')
      const data = await generateLucky(interactionTimestamp)
      console.log('Lucky data received:', {
        combinedPrompt: data.combinedPrompt,
        requestId: data.requestId,
        timestamp: interactionTimestamp,
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
      console.log('Dispatching GENERATE_DRAFT with timestamp:', interactionTimestamp)
      send({ type: 'GENERATE_DRAFT', timestamp: interactionTimestamp })
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

  useEffect(() => {
    const scriptToRevise = localStorage.getItem('scriptToRevise')
    const originalPrompt = localStorage.getItem('originalPrompt')

    if (scriptToRevise && originalPrompt && !state.context.prompt) {
      const enhancePrompt = `Revise this script with the following instructions:

Original prompt that generated this script:
${originalPrompt}

The script to revise:
\`\`\`typescript
${scriptToRevise}
\`\`\`

Instructions:
1. Make the code more efficient and performant
2. Improve readability and maintainability
3. Add better error handling where needed
4. Ensure type safety and remove any potential type issues
5. Keep the core functionality exactly the same
6. Add helpful comments for complex logic`

      send({ type: 'SET_PROMPT', prompt: enhancePrompt })

      // Clean up localStorage
      localStorage.removeItem('scriptToRevise')
      localStorage.removeItem('originalPrompt')

      // Use existing timestamp if available
      const interactionTimestamp =
        state.context.interactionTimestamp ||
        new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')
      send({ type: 'GENERATE_DRAFT', timestamp: interactionTimestamp })
    }
  }, [state.context.prompt, send])

  useEffect(() => {
    if (headingRef.current) {
      console.log('Heading height:', {
        height: headingRef.current.offsetHeight,
        text: headingRef.current.textContent,
        timestamp: new Date().toISOString(),
      })
    }
  }, [state.context.generatedScript, isGenerating, isThinking, generationPhase])

  return (
    <div className="px-5 w-full">
      <div className="min-h-[120px] flex items-center justify-center">
        <h1
          ref={headingRef}
          className="text-2xl lg:text-3xl xl:text-5xl font-semibold mx-auto w-full text-center max-w-4xl"
        >
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
            <div className="flex flex-col gap-4">
              <span className="block">{STRINGS.SCRIPT_GENERATION.headingDone.split('.')[0]}</span>
              <span className="block text-[0.85em] text-muted-foreground font-normal">
                {STRINGS.SCRIPT_GENERATION.headingDone.split('.')[1]}
              </span>
            </div>
          ) : (
            heading
          )}
        </h1>
      </div>

      {!state.context.generatedScript && !isGenerating && !isThinking && (
        <form
          onSubmit={handleSubmit}
          className={`mx-auto w-full mt-12 max-w-2xl ${isAuthenticated ? '' : 'pb-4'}`}
        >
          <div className="relative flex items-center justify-center">
            <Textarea
              ref={textareaRef}
              value={state.context.prompt}
              onChange={e => send({ type: 'SET_PROMPT', prompt: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder={
                state.context.usageCount === state.context.usageLimit
                  ? STRINGS.SCRIPT_GENERATION.promptPlaceholderLimitReached
                  : STRINGS.SCRIPT_GENERATION.promptPlaceholderDefault
                // STRINGS.SCRIPT_GENERATION.promptPlaceholderSignIn
              }
              rows={3}
              className="min-h-[127px] w-full shadow-2xl sm:p-6 p-5 sm:!text-lg placeholder:text-base sm:placeholder:text-lg placeholder:text-gray-400 bg-card rounded-xl"
              disabled={state.context.usageCount === state.context.usageLimit}
            />
            <div
              className="absolute z-10 top-0 w-[40%] blur-sm h-px bg-gradient-to-r from-transparent via-primary to-transparent"
              aria-hidden="true"
            />
            <div
              className="absolute z-10 top-0 w-[90%] opacity-40 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
              aria-hidden="true"
            />
            <Button
              type="submit"
              size="icon"
              disabled={state.matches('generatingDraft') || state.matches('generatingFinal')}
              className="absolute right-3 bottom-3"
              // className="flex items-center gap-2 bg-primary text-primary-foregorund px-6 py-2 rounded font-medium hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {state.matches('generatingDraft') || state.matches('generatingFinal') ? (
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowUp className="w-5 h-5" />
              )}
              {/* <span>Generate</span> */}
            </Button>
          </div>
          <div
            className={cn('flex items-center pt-2 tabular-nums text-xs px-2', {
              'justify-between': isAuthenticated,
              'justify-center': !isAuthenticated,
            })}
          >
            <span
              className={cn('text-muted-foreground opacity-50', {
                'opacity-100': state.context.prompt.trim().length < 15,
              })}
            >
              {STRINGS.SCRIPT_GENERATION.characterCount.replace(
                '{count}',
                state.context.prompt.trim().length.toString()
              )}
            </span>
            {isAuthenticated ? (
              <span
                className={cn('text-xs text-muted-foreground', {
                  'text-destructive': state.context.usageCount >= state.context.usageLimit,
                })}
              >
                {`${state.context.usageLimit - state.context.usageCount} generations left today`}
              </span>
            ) : null}
          </div>

          {state.context.error && (
            <>
              <Alert variant="destructive" className="mt-4">
                <AlertTitle>{STRINGS.SCRIPT_GENERATION.errorHeading}</AlertTitle>
                <AlertDescription>{state.context.error}</AlertDescription>
              </Alert>
            </>
          )}
        </form>
      )}

      {!state.context.generatedScript && !isGenerating && !isThinking && (
        <div className="justify-center mt-4 max-w-3xl mx-auto flex items-center gap-2">
          {/* <h2 className="text-muted-foreground mb-4 mt-8 text-sm text-center">
            {STRINGS.SCRIPT_GENERATION.scriptSuggestionsHeading}
          </h2> */}
          <Button
            variant="outline"
            type="button"
            size="sm"
            className="rounded-full"
            onClick={handleFeelingLucky}
            disabled={state.matches('generatingDraft') || state.matches('generatingFinal')}
            // className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-black font-semibold px-4 py-2 rounded-lg transition-colors ml-4"
          >
            <SparklesIcon className="w-5 h-5" />
            I'm Feeling Lucky
          </Button>
          <ScriptSuggestions
            setPrompt={prompt => {
              if (!isAuthenticated) {
                showSignInModal()
                return
              }
              send({ type: 'SET_PROMPT', prompt })
              send({ type: 'FROM_SUGGESTION', value: true })
            }}
            setIsFromSuggestion={() => {}}
            suggestions={suggestions}
          />
        </div>
      )}

      {(isGenerating || isThinking || state.context.generatedScript) &&
        !state.context.editableScript && (
          <div className="mt-8">
            <div className="relative mb-2 max-w-4xl mx-auto">
              <div className="bg-zinc-900/10 rounded-lg overflow-hidden border border-amber-400/10 ring-1 ring-amber-400/20 shadow-amber-900/20">
                <div className="w-full h-[600px] relative flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-amber-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {(isGenerating || isThinking || state.context.generatedScript) &&
        state.context.editableScript && (
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
                    theme="gruvboxTheme"
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
                      <button
                        type="button"
                        onClick={() => {
                          const scriptToRevise =
                            state.context.editableScript || state.context.generatedScript
                          if (!scriptToRevise) {
                            toast.error('No script to enhance')
                            return
                          }

                          // Store what we need before reset
                          const currentScript = scriptToRevise
                          const currentPrompt = state.context.prompt

                          // First reset the state
                          send({ type: 'RESET' })

                          // After a small delay to ensure reset is complete
                          setTimeout(() => {
                            const enhancePrompt = `Revise this script with the following instructions:

Original prompt that generated this script:
${currentPrompt}

The script to revise:
\`\`\`typescript
${currentScript}
\`\`\`

Instructions:
1. Make the code more efficient and performant
2. Improve readability and maintainability
3. Add better error handling where needed
4. Ensure type safety and remove any potential type issues
5. Keep the core functionality exactly the same
6. Add helpful comments for complex logic

Your revision instructions: `

                            send({ type: 'SET_PROMPT', prompt: enhancePrompt })

                            // Scroll textarea to bottom after setting prompt
                            if (textareaRef.current) {
                              requestAnimationFrame(() => {
                                if (textareaRef.current) {
                                  textareaRef.current.scrollTop = textareaRef.current.scrollHeight
                                  textareaRef.current.focus()
                                }
                              })
                            }
                          }, 0)
                        }}
                        className="bg-gradient-to-tr from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition-colors flex items-center gap-2"
                      >
                        <SparklesIcon className="w-5 h-5" />
                        Enhance with AI
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      <Dialog modal={true} open={isSignInModalShowing} onOpenChange={setShowSignInModal}>
        <DialogContent className="z-50">
          <DialogHeader>
            <DialogTitle>Sign in with GitHub to generate</DialogTitle>
            <DialogDescription>
              Sign in to generate scripts and save your work. We use GitHub to authenticate.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="">
            <Button
              className="w-full"
              size="lg"
              onClick={() => {
                signIn()
                setShowSignInModal(false)
              }}
            >
              <FaGithub className="w-4" /> Sign in with GitHub
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
