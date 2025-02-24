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

function ScriptGenerationClient({ isAuthenticated, heading, suggestions }: Props) {
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
    const controller = new AbortController()

    // Enhanced logging for debugging
    console.log('[FINAL_GEN] Effect triggered:', {
      state: state.value,
      scriptId: state.context.scriptId,
      isStreaming: isStreamingRef.current,
      hasStarted: finalGenerationStartedRef.current,
      isTransitioning: state.context.isTransitioningToFinal,
      timestamp: new Date().toISOString(),
    })

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
          isTransitioning: state.context.isTransitioningToFinal,
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
      // Enhanced guard check logging
      console.log('[FINAL_GEN] Guard check:', {
        isGeneratingFinal: state.matches('generatingFinal'),
        hasScriptId: Boolean(state.context.scriptId),
        hasStarted: finalGenerationStartedRef.current,
        isStreaming: isStreamingRef.current,
        isTransitioning: state.context.isTransitioningToFinal,
        timestamp: new Date().toISOString(),
      })

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
            isTransitioning: state.context.isTransitioningToFinal,
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
        const reason = !state.matches('generatingFinal')
          ? 'not in generatingFinal'
          : !state.context.scriptId
            ? 'no scriptId'
            : 'already started'

        console.log('[FINAL_GEN] Guards prevented generation:', {
          reason,
          isStreaming: isStreamingRef.current,
          timestamp: new Date().toISOString(),
        })

        if (state.context.interactionTimestamp) {
          logInteraction(
            state.context.interactionTimestamp,
            'client',
            'Guards prevented final generation',
            {
              reason,
              isStreaming: isStreamingRef.current,
              timestamp: new Date().toISOString(),
            }
          ).catch(console.error)
        }
        return
      }

      if (isStreamingRef.current) {
        console.log('[FINAL_GEN] Already streaming, skipping:', {
          scriptId: state.context.scriptId,
          timestamp: new Date().toISOString(),
        })

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

      console.log('[FINAL_GEN] Starting generation:', {
        scriptId: state.context.scriptId,
        hasStarted: finalGenerationStartedRef.current,
        isStreaming: isStreamingRef.current,
        timestamp: new Date().toISOString(),
      })

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
        // Only clear the editor if we're actually starting a new stream
        // and we haven't already started streaming
        if (!controller.signal.aborted) {
          const editor = editorRef.current
          const model = editor?.getModel()
          if (model) {
            // Store the current content before clearing
            const currentContent = model.getValue()
            console.log('[FINAL_GEN] Current editor content length:', currentContent.length)

            // Only clear if we're actually starting fresh
            if (!state.context.isTransitioningToFinal) {
              console.log('[FINAL_GEN] Clearing editor and setting transitioning flag')
              model.setValue('')
              setStreamedText('')
              // Mark that we're transitioning to final
              send({ type: 'SET_TRANSITIONING_TO_FINAL', value: true })
            } else {
              console.log('[FINAL_GEN] Already transitioning, not clearing editor')
            }
          }
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

        // Create a dedicated controller for the API call
        const apiController = new AbortController()

        // Link the component controller to the API controller
        controller.signal.addEventListener('abort', () => {
          console.log('[FINAL_GEN] Component controller aborted, aborting API controller')
          apiController.abort()
        })

        console.log('[FINAL_GEN] Calling API with params:', {
          scriptId: state.context.scriptId,
          requestId: state.context.requestId,
          timestamp: new Date().toISOString(),
        })

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
              if (!isMounted || controller.signal.aborted) return
              console.log('[FINAL_GEN] Stream started')
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
              if (!isMounted || controller.signal.aborted) return
              console.log('[FINAL_GEN] Received chunk, length:', text.length)
              handleStreamedText(text)
              // Also update the state context to keep everything in sync
              send({ type: 'UPDATE_EDITABLE_SCRIPT', script: text })
            },
            onError: (error: { message: string }) => {
              if (!isMounted || controller.signal.aborted) return
              console.error('[FINAL_GEN] Stream error:', {
                error: error.message,
                scriptId: state.context.scriptId,
                isStreaming: isStreamingRef.current,
                timestamp: new Date().toISOString(),
              })
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
            signal: apiController.signal, // Pass the dedicated controller's signal
          }
        )

        if (isMounted && !controller.signal.aborted) {
          console.log('[FINAL_GEN] Stream completed successfully')
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
        if (!isMounted || controller.signal.aborted) return
        console.error('[FINAL_GEN] Generation error:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          scriptId: state.context.scriptId,
          isStreaming: isStreamingRef.current,
          timestamp: new Date().toISOString(),
        })
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
        if (isMounted && !controller.signal.aborted) {
          console.log('[FINAL_GEN] Cleaning up streaming state')
          isStreamingRef.current = false
        }
      }
    }

    startStreaming()

    return () => {
      console.log('[FINAL_GEN] Effect cleanup:', {
        scriptId: state.context.scriptId,
        isStreaming: isStreamingRef.current,
        hasStarted: finalGenerationStartedRef.current,
        timestamp: new Date().toISOString(),
      })

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
      controller.abort()
      // Reset streaming state on cleanup
      isStreamingRef.current = false
      finalGenerationStartedRef.current = false
    }
  }, [
    state.value,
    state.context.scriptId,
    state.matches,
    state.context.prompt,
    state.context.requestId,
    state.context.luckyRequestId,
    state.context.editableScript,
    state.context.interactionTimestamp,
    state.context.isTransitioningToFinal,
    handleStreamedText,
    send,
  ])

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
      const enhancedPrompt = `${originalPrompt}\n\nPlease revise this script:\n\n${scriptToRevise}`
      send({ type: 'SET_PROMPT', prompt: enhancedPrompt })
      localStorage.removeItem('scriptToRevise')
      localStorage.removeItem('originalPrompt')
    }
  }, [state.context.prompt, send])

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto">
      <h1 ref={headingRef} className="text-3xl font-bold mb-4 text-center">
        {heading}
      </h1>

      {state.context.error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{state.context.error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex flex-col space-y-2">
          <Textarea
            ref={textareaRef}
            value={state.context.prompt}
            onChange={e => send({ type: 'SET_PROMPT', prompt: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder={STRINGS.SCRIPT_GENERATION.promptPlaceholderDefault}
            className={cn(
              'min-h-[100px] resize-none p-4 text-base',
              state.matches('idle') ? 'rounded-b-none' : ''
            )}
            disabled={isGenerating || isThinking}
          />

          {state.matches('idle') && (
            <div className="flex flex-col sm:flex-row gap-2 p-2 bg-muted rounded-b-md">
              <Button
                type="submit"
                className="flex-1 gap-2"
                disabled={
                  !state.context.prompt.trim() ||
                  state.context.prompt.trim().length < 15 ||
                  isGenerating ||
                  isThinking
                }
              >
                {isGenerating || isThinking ? (
                  <AnimatedText text="Generating" />
                ) : (
                  <>
                    <DocumentCheckIcon className="h-5 w-5" />
                    Generate Script
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleFeelingLucky}
                disabled={isGenerating || isThinking}
              >
                <SparklesIcon className="h-5 w-5" />
                I'm Feeling Lucky
              </Button>
            </div>
          )}
        </div>
      </form>

      {state.matches('idle') && !state.context.prompt && (
        <ScriptSuggestions
          suggestions={suggestions}
          onSelect={(suggestion: Suggestion) => {
            send({ type: 'FROM_SUGGESTION', value: true })
            send({
              type: 'SET_PROMPT',
              prompt: `${suggestion.title}\n${suggestion.description}\n${suggestion.keyFeatures.join(', ')}`,
            })
          }}
        />
      )}

      {(state.matches('generatingDraft') ||
        state.matches('generatingFinal') ||
        state.matches('complete') ||
        state.matches('thinkingDraft')) && (
        <div className="relative border rounded-md overflow-hidden">
          <div className="absolute top-0 right-0 z-10 flex gap-1 p-1">
            {state.matches('complete') && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={() => {
                  const editor = editorRef.current
                  const model = editor?.getModel()
                  if (model) {
                    const content = model.getValue()
                    navigator.clipboard.writeText(content)
                    toast.success('Copied to clipboard!')
                  }
                }}
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                Copy
              </Button>
            )}

            {(state.matches('generatingDraft') ||
              state.matches('generatingFinal') ||
              state.matches('thinkingDraft')) && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={() => {
                  send({ type: 'CANCEL_GENERATION' })
                }}
              >
                Cancel
              </Button>
            )}

            {state.matches('complete') && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={() => {
                  send({
                    type: 'GENERATE_DRAFT',
                    timestamp: new Date().toISOString().replace(/[:.]/g, '-').replace('Z', ''),
                  })
                }}
              >
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
            )}

            {state.matches('complete') && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={() => {
                  send({ type: 'GENERATE_FINAL' })
                }}
              >
                <SparklesIcon className="h-4 w-4 mr-1" />
                Enhance
              </Button>
            )}
          </div>

          <div className="h-[500px] w-full">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              options={monacoOptions}
              theme="vs-dark"
              value={state.context.editableScript}
              onChange={value => {
                if (state.matches('complete')) {
                  send({ type: 'UPDATE_EDITABLE_SCRIPT', script: value || '' })
                }
              }}
              beforeMount={initializeTheme}
              onMount={handleEditorDidMount}
              className="monaco-editor"
            />
          </div>

          {generationPhase && (
            <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm p-2 flex justify-between items-center">
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {generationPhase === 'thinkingDraft' && <span>Thinking...</span>}
                {generationPhase === 'generatingDraft' && <span>Generating draft...</span>}
                {generationPhase === 'generatingFinal' && <span>Enhancing script...</span>}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={() => {
                  send({ type: 'CANCEL_GENERATION' })
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {isAuthenticated && (
        <div className="mt-2 text-xs text-muted-foreground text-right">
          {state.context.usageCount} / {state.context.usageLimit} generations used
        </div>
      )}

      <Dialog open={isSignInModalShowing} onOpenChange={setShowSignInModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in to continue</DialogTitle>
            <DialogDescription>
              You need to sign in with GitHub to generate scripts. Your prompt will be saved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => signIn('github')}
              className="w-full flex items-center justify-center gap-2"
            >
              <FaGithub className="h-5 w-5" />
              Sign in with GitHub
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ScriptGenerationClient
