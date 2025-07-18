/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { signIn } from 'next-auth/react'
import { Editor } from '@monaco-editor/react'
import { monacoOptions, initializeTheme } from '@/lib/monaco'
import { useSearchParams, useRouter } from 'next/navigation'

import { DocumentCheckIcon, ArrowPathIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid'
import { motion } from 'framer-motion'
import { STRINGS } from '@/lib/strings'
import AIPromptBuilder from '@/components/AIPromptBuilder'
import { scriptGenerationMachine } from './ScriptGenerationMachine'
import { useMachine } from '@xstate/react'
import toast from 'react-hot-toast'
import { fetchUsage, generateLucky, generateDraftWithProvider } from '@/lib/apiService'
import { scriptGenerationConfig } from '@/lib/config'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { cn } from '@/lib/utils'
import { safeLocalStorage } from '@/lib/event-handlers'
import { safeRequestAnimationFrame } from '@/lib/browser-utils'
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
import ScriptDebugPanel from '@/components/ScriptDebugPanel'
import { createEnhancePrompt } from '@/lib/scriptUtils'
import { Sparkles } from 'lucide-react'

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
    ) => boolean[]
    getLineLength: (line: number) => number
  } | null
  revealLine: (line: number) => void
  revealLineInCenter?: (line: number) => void
  deltaDecorations?: (oldDecorations: string[], newDecorations: unknown[]) => string[]
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

const createInteractionTimestamp = () =>
  new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')

export default function ScriptGenerationClient({ isAuthenticated, heading }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
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

  const draftGenerationControllerRef = useRef<AbortController | null>(null)
  const [isSaving, setIsSaving] = useState(false)

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

  // Retain a read-only state holder so existing debug logs compile (no perf cost)
  const [streamedText] = useState('')

  // Holds the growing script without triggering React re-renders on every chunk
  const accumulatedScriptRef = useRef('')
  const editorRef = useRef<EditorRef | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Buffer for deltas that arrive between animation frames
  const pendingDeltaRef = useRef('')
  const frameScheduledRef = useRef(false)

  // Check for forked content on mount
  useEffect(() => {
    const forkedContent = safeLocalStorage.getItem('forkedScriptContent')
    if (forkedContent && !state.context.prompt) {
      send({ type: 'SET_PROMPT', prompt: forkedContent })
      safeLocalStorage.removeItem('forkedScriptContent')

      // Focus immediately and after a delay to ensure it works
      if (textareaRef.current) {
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight
        textareaRef.current.focus()
      }
      // Try again after a delay
      safeRequestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.scrollTop = textareaRef.current.scrollHeight
          textareaRef.current.focus()
        }
      })
    }
  }, [send, state.context.prompt])

  // Handle streaming text updates (delta-based)
  const handleStreamedText = useCallback(
    (delta: string) => {
      if (!delta) return

      // Collect delta
      pendingDeltaRef.current += delta

      if (!frameScheduledRef.current) {
        frameScheduledRef.current = true

        safeRequestAnimationFrame(() => {
          const flushDelta = pendingDeltaRef.current
          pendingDeltaRef.current = ''
          frameScheduledRef.current = false

          if (!flushDelta) return

          accumulatedScriptRef.current += flushDelta

          const editor = editorRef.current
          const model = editor?.getModel()

          if (model) {
            const lastLine = model.getLineCount()
            const lastColumn = model.getLineLength(lastLine) + 1

            model.applyEdits([
              {
                range: {
                  startLineNumber: lastLine,
                  startColumn: lastColumn,
                  endLineNumber: lastLine,
                  endColumn: lastColumn,
                },
                text: flushDelta,
              },
            ])

            editor?.revealLine(model.getLineCount())
          }

          // Inform state machine of the full script
          send({ type: 'UPDATE_EDITABLE_SCRIPT', script: accumulatedScriptRef.current })
        })
      }
    },
    [send]
  )

  // Handle draft generation streaming
  useEffect(() => {
    // Debug logging
    console.log('[DRAFT EFFECT] Draft useEffect triggered with state:', {
      isThinkingDraft: state.matches('thinkingDraft'),
      isGeneratingDraft: state.matches('generatingDraft'),
      prompt: state.context.prompt.slice(0, 50) + (state.context.prompt.length > 50 ? '...' : ''),
      requestId: state.context.requestId,
      scriptId: state.context.scriptId,
      timestamp: new Date().toISOString(),
    })

    // Only proceed if we're in the thinkingDraft state
    if (!state.matches('thinkingDraft')) {
      console.log('[DRAFT EFFECT] Not in thinkingDraft state, returning early')
      return
    }

    // Create a controller for this draft generation
    const controller = new AbortController()
    draftGenerationControllerRef.current = controller
    const signal = controller.signal

    console.log('[DRAFT EFFECT] Starting draft generation with new controller')

    let isMounted = true
    const startStreaming = async () => {
      console.log('[DRAFT EFFECT] Starting generateDraftWithProvider call', {
        prompt: state.context.prompt.slice(0, 50) + (state.context.prompt.length > 50 ? '...' : ''),
        timestamp: new Date().toISOString(),
        provider: scriptGenerationConfig.draftProvider,
        environment: process.env.NODE_ENV,
        stateValue: state.value,
      })

      try {
        // Use the timestamp from context
        const timestamp =
          state.context.interactionTimestamp ||
          new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')

        // Transition to generatingDraft state before starting the API call
        send({ type: 'START_STREAMING_DRAFT' })

        console.log('[DRAFT EFFECT] State transition to generatingDraft sent', {
          timestamp: new Date().toISOString(),
          newStateValue: 'generatingDraft',
          contextPromptLength: state.context.prompt.length,
        })

        // Use the configured provider
        await generateDraftWithProvider(
          scriptGenerationConfig.draftProvider,
          state.context.prompt,
          state.context.luckyRequestId,
          timestamp,
          signal,
          {
            onStartStreaming: () => {
              if (!isMounted || signal.aborted) return
              console.log('[DRAFT EFFECT] onStartStreaming callback invoked', {
                timestamp: new Date().toISOString(),
                isMounted,
                isAborted: signal.aborted,
                environment: process.env.NODE_ENV,
              })
            },
            onScriptId: scriptId => {
              if (!isMounted || signal.aborted) return
              console.log('[DRAFT EFFECT] onScriptId callback invoked with:', scriptId, {
                timestamp: new Date().toISOString(),
                isMounted,
                isAborted: signal.aborted,
              })
              send({ type: 'SET_SCRIPT_ID', scriptId })
            },
            onChunk: text => {
              if (!isMounted || signal.aborted) return
              console.log('[DRAFT EFFECT] onChunk callback with text length:', text.length, {
                firstChars: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
                timestamp: new Date().toISOString(),
                isMounted,
                isAborted: signal.aborted,
              })
              handleStreamedText(text)
            },
            onError: error => {
              if (!isMounted || signal.aborted) return
              console.error('[DRAFT EFFECT] onError callback invoked:', error, {
                errorMessage: error.message,
                errorStack: error.stack,
                timestamp: new Date().toISOString(),
                isMounted,
                isAborted: signal.aborted,
              })
              if (error.message === 'UNAUTHORIZED') {
                handleUnauthorized()
                return
              }
              toast.error(error.message)
              send({ type: 'SET_ERROR', error: error.message })
            },
          },
          { extractReasoning: scriptGenerationConfig.extractReasoning }
        )
        console.log('[DRAFT EFFECT] Completed generateDraftWithProvider call successfully', {
          timestamp: new Date().toISOString(),
          editableScriptLength: state.context.editableScript?.length || 0,
          stateValue: state.value,
        })

        // Signal completion to the state machine
        if (isMounted && !signal.aborted) {
          console.log('[DRAFT EFFECT] Sending COMPLETE_GENERATION event', {
            timestamp: new Date().toISOString(),
            scriptLength: state.context.editableScript?.length || 0,
          })

          send({
            type: 'COMPLETE_GENERATION',
            script: state.context.editableScript || '',
          })

          console.log('[DRAFT EFFECT] COMPLETE_GENERATION event sent', {
            timestamp: new Date().toISOString(),
          })
        }
      } catch (err) {
        // Skip processing if component is unmounted or request was aborted
        if (!isMounted || signal.aborted) {
          console.log('[DRAFT EFFECT] Ignoring error after unmount/abort:', err, {
            timestamp: new Date().toISOString(),
            isMounted,
            isAborted: signal.aborted,
            error: err instanceof Error ? err.message : String(err),
          })
          return
        }

        if (err instanceof DOMException && err.name === 'AbortError') {
          console.log('[DRAFT EFFECT] Draft generation was aborted normally', {
            timestamp: new Date().toISOString(),
          })
        } else {
          console.error('[DRAFT EFFECT] generateDraftWithProvider threw an exception:', err, {
            timestamp: new Date().toISOString(),
            errorMessage: err instanceof Error ? err.message : String(err),
            errorStack: err instanceof Error ? err.stack : undefined,
            stateValue: state.value,
          })
          send({
            type: 'SET_ERROR',
            error: err instanceof Error ? err.message : 'An error occurred during draft generation',
          })
        }
      }
    }

    startStreaming()

    // Cleanup function
    return () => {
      console.log('[DRAFT EFFECT] Cleaning up draft streaming effect')

      // Mark component as unmounted to prevent state updates after cleanup
      isMounted = false

      // Only abort if this is still the current controller and it hasn't been aborted yet
      if (draftGenerationControllerRef.current === controller) {
        console.log('[DRAFT EFFECT] Aborting draft controller during cleanup')
        try {
          // Check if not already aborted before attempting to abort
          if (!controller.signal.aborted) {
            controller.abort()
          } else {
            console.log('[DRAFT EFFECT] Controller already aborted, skipping abort call')
          }
        } catch (error) {
          console.warn('[DRAFT EFFECT] Error during draft controller abort:', error)
        } finally {
          // Always clear the controller reference in cleanup
          draftGenerationControllerRef.current = null
        }
      }
    }
  }, [
    state.matches,
    state.context.prompt,
    state.context.requestId,
    state.context.luckyRequestId,
    state.context.interactionTimestamp,
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

  const handleEditorDidMount = (editor: unknown) => {
    // Create a wrapper that matches our EditorRef interface
    const editorWrapper: EditorRef = {
      getModel: () => {
        const model = (editor as any).getModel()
        return model
      },
      revealLine: (line: number) => (editor as any).revealLine(line),
      revealLineInCenter: (line: number) => (editor as any).revealLineInCenter(line),
      deltaDecorations: (oldDecorations: string[], newDecorations: unknown[]) =>
        (editor as any).deltaDecorations(oldDecorations, newDecorations),
    }

    editorRef.current = editorWrapper
    console.log('[EDITOR] Editor mounted successfully')

    // Update the editor with the complete script from state (if available)
    if (state.context.editableScript) {
      const model = editorWrapper.getModel()
      if (model && model.getValue() !== state.context.editableScript) {
        console.log('[EDITOR] Applying complete script from state')
        model.setValue(state.context.editableScript)
        const lineCount = model.getLineCount()
        safeRequestAnimationFrame(() => {
          editorWrapper.revealLine(lineCount)
        })
      }
    }
  }

  // Log state transitions
  useEffect(() => {
    // Log state transitions in detail
    console.log('[STATE_TRANSITION] State changed:', {
      previousState: previousStateRef.current,
      currentState: state.value,
      timestamp: new Date().toISOString(),
      editableScriptLength: state.context.editableScript?.length || 0,
      hasStreamedText: !!streamedText && streamedText.length > 0,
      streamedTextLength: streamedText?.length || 0,
      promptLength: state.context.prompt?.length || 0,
      environment: process.env.NODE_ENV,
    })

    // Store current state for next transition comparison
    previousStateRef.current = state.value
  }, [state.value, state.context.editableScript, streamedText, state.context.prompt])

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
    if (editor) {
      const model = editor.getModel()
      // Update the editor if its current value differs from the final script
      if (model && state.context.editableScript !== model.getValue()) {
        model.setValue(state.context.editableScript)
        const lineCount = model.getLineCount()
        editor.revealLine(lineCount)
      }
    }
  }, [state.context.editableScript])

  const [isSignInModalShowing, setShowSignInModal] = useState(false)

  const showSignInModal = () => {
    // Save the current prompt to localStorage before showing sign in modal
    if (state.context.prompt) {
      safeLocalStorage.setItem('pendingPrompt', state.context.prompt)
    }
    setShowSignInModal(true)
  }

  // Check for pending prompt on mount
  useEffect(() => {
    const pendingPrompt = safeLocalStorage.getItem('pendingPrompt')
    if (pendingPrompt && isAuthenticated) {
      send({ type: 'SET_PROMPT', prompt: pendingPrompt })
      safeLocalStorage.removeItem('pendingPrompt')

      const autoSubmit = safeLocalStorage.getItem('autoSubmit')
      if (autoSubmit === 'true') {
        safeLocalStorage.removeItem('autoSubmit')
        send({ type: 'GENERATE_DRAFT', timestamp: createInteractionTimestamp() })
      }
    }
  }, [isAuthenticated, send])

  // Add a submission lock state to prevent duplicate submissions
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Prevent duplicate submission
    if (isSubmitting) return

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

    // Lock submission
    setIsSubmitting(true)

    // Generate a single timestamp for the entire interaction chain
    send({ type: 'GENERATE_DRAFT', timestamp: createInteractionTimestamp() })
  }

  // Handle keyboard submission
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()

      // Prevent duplicate submission
      if (isSubmitting) return

      if (!state.context.prompt.trim() || state.context.prompt.trim().length < 9) return
      if (!isAuthenticated) {
        showSignInModal()
        // signIn()
        return
      }

      // Lock submission
      setIsSubmitting(true)

      // Use the same timestamp from handleSubmit if it exists
      send({ type: 'GENERATE_DRAFT', timestamp: createInteractionTimestamp() })
    }
  }

  const isGenerating = state.matches('generatingDraft')

  const isThinking = state.context.isFromSuggestion
  const generationPhase = state.matches('thinkingDraft')
    ? 'thinkingDraft'
    : state.matches('generatingDraft')
      ? 'generatingDraft'
      : null

  // Watch for suggestion selection and trigger generation
  useEffect(() => {
    console.log('[SUGGESTION EFFECT] Suggestion effect triggered:', {
      isFromSuggestion: state.context.isFromSuggestion,
      promptLength: state.context.prompt.trim().length,
      isAuthenticated,
      isInGeneratingState: state.matches('thinkingDraft') || state.matches('generatingDraft'),
      timestamp: new Date().toISOString(),
    })

    // Only proceed if all conditions are met:
    // 1. Prompt was set from a suggestion
    // 2. Prompt is long enough to be valid
    // 3. User is authenticated
    // 4. We're not already in a generation state
    // 5. NEW: Not a lucky request in progress
    if (
      state.context.isFromSuggestion &&
      !state.context.luckyRequestId && // NEW: Only auto-trigger if not a lucky request
      state.context.prompt.trim().length >= 15 &&
      isAuthenticated &&
      !state.matches('thinkingDraft') &&
      !state.matches('generatingDraft')
    ) {
      console.log('[SUGGESTION EFFECT] Auto-triggering generation from suggestion')

      // Use a slight delay to ensure state has settled
      const triggerTimeout = setTimeout(() => {
        // Double-check we're still in a valid state before triggering
        if (
          state.context.isFromSuggestion &&
          !state.context.luckyRequestId && // NEW: Double-check not a lucky request
          !state.matches('thinkingDraft') &&
          !state.matches('generatingDraft')
        ) {
          console.log('[SUGGESTION EFFECT] Dispatching GENERATE_DRAFT after delay')

          // Use the existing timestamp if available or create a new one
          send({ type: 'GENERATE_DRAFT', timestamp: createInteractionTimestamp() })

          // Reset the isFromSuggestion flag to prevent re-triggering
          send({ type: 'FROM_SUGGESTION', value: false })
        } else {
          console.log('[SUGGESTION EFFECT] State changed during delay, generation not triggered')
        }
      }, 50) // Short delay to ensure state consistency

      // Clean up timeout if component unmounts or dependencies change
      return () => clearTimeout(triggerTimeout)
    }
  }, [
    state.context.isFromSuggestion,
    state.context.prompt,
    state.context.luckyRequestId,
    isAuthenticated,
    state.matches,
    send,
  ])

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
      const interactionTimestamp = createInteractionTimestamp()
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

  // Check for script to revise from localStorage
  useEffect(() => {
    const scriptToRevise = safeLocalStorage.getItem('scriptToRevise')
    const originalPrompt = safeLocalStorage.getItem('originalPrompt')
    const manualRevision = safeLocalStorage.getItem('manualRevision')

    if (scriptToRevise && originalPrompt && !state.context.prompt) {
      const enhancePrompt = createEnhancePrompt(originalPrompt, scriptToRevise)

      send({ type: 'SET_PROMPT', prompt: enhancePrompt })

      // Clean up localStorage
      safeLocalStorage.removeItem('scriptToRevise')
      safeLocalStorage.removeItem('originalPrompt')

      // Only auto-generate if not manual revision
      if (manualRevision !== 'true') {
        // Use existing timestamp if available
        send({ type: 'GENERATE_DRAFT', timestamp: createInteractionTimestamp() })
      } else {
        // Clean up the manual revision flag
        safeLocalStorage.removeItem('manualRevision')

        // Focus and scroll the textarea to the bottom after a short delay
        // to ensure the UI has updated
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.scrollTop = textareaRef.current.scrollHeight
            textareaRef.current.focus()

            // Place cursor at the end of the text
            const length = textareaRef.current.value.length
            textareaRef.current.setSelectionRange(length, length)
          }
        }, 100)
      }
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

  // Add effect to reset submission lock when state changes or when an error is set
  useEffect(() => {
    // Check for states that should reset the submission lock
    // Using string literals that match the actual state names in the machine
    if (
      state.matches('generatingDraft') ||
      state.matches('complete') ||
      state.matches('idle') ||
      state.context.error !== null // Check for error in context instead of an error state
    ) {
      setIsSubmitting(false)
    }
  }, [state])

  // Add this at the top with other refs
  const previousStateRef = useRef<string>('')

  // Check for prompt from query on mount
  useEffect(() => {
    const promptFromQuery = searchParams?.get('prompt')
    const promptFromQueryB64 = searchParams?.get('prompt_b64')

    let finalPrompt = null
    if (promptFromQuery) {
      finalPrompt = promptFromQuery
    } else if (promptFromQueryB64) {
      try {
        finalPrompt = atob(promptFromQueryB64)
      } catch (e) {
        console.error('Failed to decode base64 prompt:', e)
      }
    }

    if (finalPrompt) {
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('prompt')
      newUrl.searchParams.delete('prompt_b64')
      router.replace(newUrl.toString(), { scroll: false })

      if (isAuthenticated) {
        send({ type: 'SET_PROMPT', prompt: finalPrompt })
        send({ type: 'GENERATE_DRAFT', timestamp: createInteractionTimestamp() })
      } else {
        safeLocalStorage.setItem('pendingPrompt', finalPrompt)
        safeLocalStorage.setItem('autoSubmit', 'true')
        setShowSignInModal(true)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
                  : state.context.editableScript && state.context.editableScript.trim().length > 0
                    ? STRINGS.SCRIPT_GENERATION.headingWhileGenerating
                    : STRINGS.SCRIPT_GENERATION.headingWhileReasoning
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
              onChange={e =>
                send({ type: 'SET_PROMPT', prompt: (e.target as HTMLTextAreaElement).value })
              }
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
              disabled={state.matches('generatingDraft')}
              className="absolute right-3 bottom-3"
              // className="flex items-center gap-2 bg-primary text-primary-foregorund px-6 py-2 rounded font-medium hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {state.matches('generatingDraft') ? (
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
        <div className="max-w-3xl mx-auto mt-6 space-y-6">
          <div className="flex justify-center">
            <Button
              variant="outline"
              type="button"
              size="sm"
              className="h-8 px-4 text-xs rounded-full border-white/10  text-white bg-white/10 hover:bg-purple-600 transition-all duration-200"
              onClick={handleFeelingLucky}
              disabled={state.matches('generatingDraft')}
            >
              <Sparkles className="w-4 h-4 mr-2 text-white/50 hover:text-primary" />
              I&apos;m Feeling Lucky
            </Button>
          </div>

          <AIPromptBuilder
            prompt={state.context.prompt}
            setPrompt={p => {
              send({ type: 'SET_PROMPT', prompt: p })
            }}
            onGenerate={() => {
              if (!isAuthenticated) {
                showSignInModal()
                return
              }

              const interactionTimestamp = createInteractionTimestamp()

              send({ type: 'GENERATE_DRAFT', timestamp: interactionTimestamp })
            }}
            isAuthenticated={isAuthenticated}
            maxDepth={5}
            showSignInModal={showSignInModal}
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
                <div className="absolute inset-0 flex flex-col pointer-events-none">
                  <div className="flex-1 relative">
                    <div className="absolute bottom-4 right-4 flex gap-2 pointer-events-auto">
                      <button
                        onClick={async () => {
                          if (isSaving) return
                          setIsSaving(true)
                          try {
                            await send({ type: 'SAVE_SCRIPT' })
                          } finally {
                            setIsSaving(false)
                          }
                        }}
                        className="bg-gradient-to-tr from-amber-300 to-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition-colors flex items-center gap-2"
                        disabled={isSaving}
                      >
                        <DocumentCheckIcon className="w-5 h-5" />
                        Save
                      </button>
                      <button
                        onClick={async () => {
                          if (isSaving) return
                          setIsSaving(true)
                          try {
                            await send({ type: 'SAVE_AND_INSTALL' })
                          } finally {
                            setIsSaving(false)
                          }
                        }}
                        className="bg-gradient-to-tr from-amber-300 to-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition-colors flex items-center gap-2"
                        disabled={isSaving}
                      >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        Save & Install
                      </button>
                      <button
                        onClick={() => {
                          send({ type: 'RESET' })
                        }}
                        className="bg-gradient-to-tr from-gray-700 to-gray-800 text-slate-300 px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition-colors flex items-center gap-2"
                      >
                        <ArrowPathIcon className="w-5 h-5" />
                        Start Over
                      </button>
                      <button
                        onClick={() => {
                          // Store the current script and prompt in localStorage
                          safeLocalStorage.setItem(
                            'scriptToRevise',
                            state.context.editableScript || ''
                          )
                          safeLocalStorage.setItem('originalPrompt', state.context.prompt)
                          // Add a flag to indicate we want manual editing
                          safeLocalStorage.setItem('manualRevision', 'true')

                          // Reset the state machine to return to the input form
                          send({ type: 'RESET' })
                        }}
                        className="bg-gradient-to-tr from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition-colors flex items-center gap-2"
                      >
                        <Sparkles className="w-5 h-5" />
                        Revise with AI
                      </button>
                    </div>
                  </div>
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

      {/* Debug Panel - Only visible in development */}
      <ScriptDebugPanel
        state={state.value as string}
        editorContent={state.context.editableScript || ''}
        prompt={state.context.prompt}
        scriptId={state.context.scriptId}
        requestId={state.context.requestId}
        luckyRequestId={state.context.luckyRequestId}
        isFromLucky={state.context.isFromLucky}
        isFromSuggestion={state.context.isFromSuggestion}
        error={state.context.error}
      />
    </div>
  )
}
