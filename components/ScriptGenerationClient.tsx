/* eslint-disable @typescript-eslint/no-explicit-any */
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
import ScriptDebugPanel from '@/components/ScriptDebugPanel'

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
  const finalGenerationControllerRef = useRef<AbortController | null>(null)
  const draftGenerationControllerRef = useRef<AbortController | null>(null)

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
    console.log('[STREAMING_DEBUG] handleStreamedText called:', {
      textLength: text.length,
      firstChars: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
      timestamp: new Date().toISOString(),
    })

    const editor = editorRef.current
    const model = editor?.getModel()

    if (!model) {
      console.log('[STREAMING_DEBUG] Model not available, using fallback setStreamedText')
      setStreamedText(text)
      return
    }

    try {
      // Get the current content in the editor
      const currentContent = model.getValue()

      console.log('[STREAMING_DEBUG] Current editor state:', {
        currentContentLength: currentContent.length,
        incomingTextLength: text.length,
        difference: text.length - currentContent.length,
        timestamp: new Date().toISOString(),
      })

      // Edge case: If editor is completely empty, just set the entire content
      if (!currentContent.trim()) {
        console.log('[STREAMING_DEBUG] Editor empty, setting entire content')
        model.setValue(text)
        setStreamedText(text)
        return
      }

      // Compare content length to determine update approach
      if (text.length > currentContent.length) {
        // Normal case: we have new content to append
        const newContent = text.slice(currentContent.length)

        console.log('[STREAMING_DEBUG] Appending new content:', {
          newContentLength: newContent.length,
          newContentPreview: newContent.substring(0, 30) + (newContent.length > 30 ? '...' : ''),
          timestamp: new Date().toISOString(),
        })

        // Get the last line position
        const range = model.getFullModelRange()

        // Create an edit operation to append the new content
        const editResult = model.applyEdits([
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

        console.log('[STREAMING_DEBUG] Edit operation result:', {
          success: Array.isArray(editResult) && editResult.length > 0,
          newModelLength: model.getValue().length,
          timestamp: new Date().toISOString(),
        })

        // Ensure we scroll to the bottom with smooth animation
        const lineCount = model.getLineCount()
        if (editor) {
          // Use a small delay to ensure the content is rendered before scrolling
          requestAnimationFrame(() => {
            // Always scroll to bottom
            editor.revealLine(lineCount)
            console.log('[STREAMING_DEBUG] Revealed last line:', {
              lineCount,
              timestamp: new Date().toISOString(),
            })

            // Add a visual indicator that new content has been added
            try {
              const lastLineLength = model.getLineLength(lineCount) || 0

              // Only attempt to add decorations if the method exists
              if (typeof editor.deltaDecorations === 'function') {
                const decorations = editor.deltaDecorations(
                  [],
                  [
                    {
                      range: {
                        startLineNumber: lineCount,
                        startColumn: 1,
                        endLineNumber: lineCount,
                        endColumn: lastLineLength + 1,
                      },
                      options: {
                        className: 'streaming-highlight',
                        isWholeLine: true,
                        animate: true, // Enable decoration animation
                      },
                    },
                  ]
                )

                // Remove the decoration after a short delay
                setTimeout(() => {
                  if (editor && typeof editor.deltaDecorations === 'function') {
                    editor.deltaDecorations(decorations, [])
                  }
                }, 300)
              }
            } catch (decorationError) {
              console.warn('[STREAMING_DEBUG] Error adding decoration:', decorationError)
            }
          })
        }

        // Also update the streamedText state to keep it in sync
        setStreamedText(text)
      } else if (text.length < currentContent.length) {
        // Rare case: the new text is shorter (usually only happens during state transitions)
        console.log('[STREAMING_DEBUG] Replacing entire content - new text is shorter:', {
          currentLength: currentContent.length,
          newLength: text.length,
          difference: currentContent.length - text.length,
          timestamp: new Date().toISOString(),
        })
        model.setValue(text)
        setStreamedText(text)
      } else if (text !== currentContent) {
        // If same length but different content (rare)
        console.log('[STREAMING_DEBUG] Same length but different content, replacing')
        model.setValue(text)
        setStreamedText(text)
      } else {
        // No change needed
        console.log('[STREAMING_DEBUG] Text identical to current content, no update needed')
      }
    } catch (error) {
      // Fallback if there's any error with the editor operations
      console.error('[STREAMING_DEBUG] Error updating editor, using fallback:', error)
      setStreamedText(text)

      // Try to update the model directly as a last resort
      if (model) {
        try {
          model.setValue(text)
          console.log('[STREAMING_DEBUG] Used direct setValue fallback')
        } catch (err) {
          console.error('[STREAMING_DEBUG] Final fallback failed:', err)
        }
      }
    }
  }, [])

  // Handle draft generation streaming
  useEffect(() => {
    // Debug logging
    console.log('[DRAFT EFFECT] Draft useEffect triggered with state:', {
      isThinkingDraft: state.matches('thinkingDraft'),
      isGeneratingDraft: state.matches('generatingDraft'),
      isGeneratingFinal: state.matches('generatingFinal'),
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
      console.log('[DRAFT EFFECT] Starting generateDraftWithStream call', {
        prompt: state.context.prompt.slice(0, 50) + (state.context.prompt.length > 50 ? '...' : ''),
        timestamp: new Date().toISOString(),
      })

      try {
        // Use the timestamp from context
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
              if (!isMounted || signal.aborted) return
              console.log('[DRAFT EFFECT] onStartStreaming callback invoked')
              if (state.matches('thinkingDraft')) {
                console.log('[DRAFT EFFECT] Transitioning to START_STREAMING_DRAFT')
                send({ type: 'START_STREAMING_DRAFT' })
              }
            },
            onScriptId: scriptId => {
              if (!isMounted || signal.aborted) return
              console.log('[DRAFT EFFECT] onScriptId callback invoked with:', scriptId)
              send({ type: 'SET_SCRIPT_ID', scriptId })
            },
            onChunk: text => {
              if (!isMounted || signal.aborted) return
              console.log('[DRAFT EFFECT] onChunk callback with text length:', text.length)
              handleStreamedText(text)
              send({ type: 'UPDATE_EDITABLE_SCRIPT', script: text })
            },
            onError: error => {
              if (!isMounted || signal.aborted) return
              console.error('[DRAFT EFFECT] onError callback invoked:', error)
              if (error.message === 'UNAUTHORIZED') {
                handleUnauthorized()
                return
              }
              toast.error(error.message)
              send({ type: 'SET_ERROR', error: error.message })
            },
          }
        )
        console.log('[DRAFT EFFECT] Completed generateDraftWithStream call successfully')
      } catch (err) {
        // Skip processing if component is unmounted or request was aborted
        if (!isMounted || signal.aborted) {
          console.log('[DRAFT EFFECT] Ignoring error after unmount/abort:', err)
          return
        }

        if (err instanceof DOMException && err.name === 'AbortError') {
          console.log('[DRAFT EFFECT] Draft generation was aborted normally')
        } else {
          console.error('[DRAFT EFFECT] generateDraftWithStream threw an exception:', err)
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

  // Effect for final generation streaming
  useEffect(() => {
    // Create a mounted flag for cleanup
    let isMounted = true

    // Create a counter for chunks received to track streaming progress
    let chunksReceived = 0
    let lastChunkTime = Date.now()
    let lastChunkSize = 0
    let currentDisplayedText = ''

    // Debug the current state for better tracking
    console.log('[FINAL_EFFECT_DEBUG] Effect triggered with state:', {
      matches: {
        generatingFinal: state.matches('generatingFinal'),
        complete: state.matches('complete'),
        thinkingDraft: state.matches('thinkingDraft'),
      },
      scriptId: state.context.scriptId,
      hasStarted: finalGenerationStartedRef.current,
      isStreaming: isStreamingRef.current,
      timestamp: new Date().toISOString(),
    })

    // Only proceed if we are in the generatingFinal state and the actual effect should run
    if (!state.matches('generatingFinal') || !state.context.scriptId) {
      console.log(
        '[FINAL_EFFECT_DEBUG] Skipping final generation effect, not in final state or no scriptId',
        {
          inGeneratingFinal: state.matches('generatingFinal'),
          hasScriptId: Boolean(state.context.scriptId),
          timestamp: new Date().toISOString(),
        }
      )
      return
    }

    // Also skip if we've already started the generation to prevent duplicate starts
    if (finalGenerationStartedRef.current) {
      console.log('[FINAL_EFFECT_DEBUG] Final generation already started, skipping', {
        scriptId: state.context.scriptId,
        timestamp: new Date().toISOString(),
      })
      return
    }

    // Set started flag immediately to prevent duplicate starts
    finalGenerationStartedRef.current = true
    isStreamingRef.current = true

    // Create a new abort controller
    const controller = new AbortController()
    finalGenerationControllerRef.current = controller
    const signal = controller.signal

    // Log the start of this process
    console.log('[FINAL_EFFECT_DEBUG] Starting final generation with controller', {
      scriptId: state.context.scriptId,
      timestamp: new Date().toISOString(),
      signalAborted: signal.aborted,
    })

    if (state.context.interactionTimestamp) {
      logInteraction(state.context.interactionTimestamp, 'client', 'Starting final generation', {
        scriptId: state.context.scriptId,
        timestamp: new Date().toISOString(),
      }).catch(console.error)
    }

    // Define the streaming function
    const startFinalGeneration = async () => {
      try {
        // Only clear the editor if we're actually starting a new stream
        // and we haven't already started transitioning
        if (!signal.aborted && !state.context.isTransitioningToFinal) {
          console.log('[FINAL_EFFECT_DEBUG] Setting transitioning to final flag', {
            scriptId: state.context.scriptId,
            timestamp: new Date().toISOString(),
          })

          const editor = editorRef.current
          const model = editor?.getModel()
          if (model) {
            model.setValue('')
            setStreamedText('')
            // Mark that we're transitioning to final
            send({ type: 'SET_TRANSITIONING_TO_FINAL', value: true })
          }
        }

        if (state.context.interactionTimestamp) {
          logInteraction(
            state.context.interactionTimestamp,
            'client',
            'About to call generateFinalWithStream',
            {
              scriptId: state.context.scriptId,
              timestamp: new Date().toISOString(),
            }
          ).catch(console.error)
        }

        // Clear the editor initially - we'll show a spinner overlay instead of text
        const editor = editorRef.current
        const model = editor?.getModel()
        if (model) {
          model.setValue('')
          currentDisplayedText = ''
        }

        const startTime = Date.now()
        console.log(
          '[FINAL_EFFECT_DEBUG] Starting generateFinalWithStream call at:',
          new Date().toISOString()
        )

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
            signal,
            onStartStreaming: () => {
              if (!isMounted || signal.aborted) return

              console.log('[FINAL_EFFECT_DEBUG] Final stream started callback', {
                scriptId: state.context.scriptId,
                timestamp: new Date().toISOString(),
              })

              if (state.context.interactionTimestamp) {
                logInteraction(
                  state.context.interactionTimestamp,
                  'client',
                  'Final stream started',
                  {
                    scriptId: state.context.scriptId,
                    timestamp: new Date().toISOString(),
                  }
                ).catch(console.error)
              }
            },
            onChunk: (text: string) => {
              if (!isMounted || signal.aborted) return

              // Increment our chunk counter
              chunksReceived++

              // Calculate time since last chunk
              const now = Date.now()
              const timeSinceLastChunk = now - lastChunkTime
              const newContentSize = text.length - lastChunkSize
              lastChunkTime = now
              lastChunkSize = text.length

              console.log('[FINAL_EFFECT_DEBUG] Final generation chunk received', {
                chunkNumber: chunksReceived,
                totalLength: text.length,
                newContentSize: newContentSize,
                timeSinceLastChunk: `${timeSinceLastChunk}ms`,
                elapsedTime: `${now - startTime}ms`,
                timestamp: new Date().toISOString(),
              })

              // Process the text and update editor
              // Only update if the text has actually changed
              if (text !== currentDisplayedText) {
                currentDisplayedText = text
                handleStreamedText(text)

                // Also update the state context to keep everything in sync
                send({ type: 'UPDATE_EDITABLE_SCRIPT', script: text })
              } else {
                console.log('[FINAL_EFFECT_DEBUG] Skipping update - text unchanged')
              }

              // For debugging: If we received only one large chunk, that suggests
              // the server sent everything at once rather than streaming
              if (chunksReceived === 1 && text.length > 1000) {
                console.warn(
                  '[FINAL_EFFECT_DEBUG] Received a large first chunk, suggesting server sent everything at once',
                  {
                    chunkSize: text.length,
                    timestamp: new Date().toISOString(),
                  }
                )
              }
            },
            onError: (error: { message: string }) => {
              if (!isMounted || signal.aborted) return

              console.error('[FINAL_EFFECT_DEBUG] Final generation error:', error.message)
              if (state.context.interactionTimestamp) {
                logInteraction(state.context.interactionTimestamp, 'client', 'Final stream error', {
                  error: error.message,
                  scriptId: state.context.scriptId,
                  timestamp: new Date().toISOString(),
                }).catch(console.error)
              }
              send({ type: 'SET_ERROR', error: error.message })
            },
          }
        )

        // Only execute completion logic if still mounted and not aborted
        if (isMounted && !signal.aborted) {
          console.log('[FINAL_EFFECT_DEBUG] Final generation completed successfully', {
            totalChunks: chunksReceived,
            totalTime: `${Date.now() - startTime}ms`,
            scriptId: state.context.scriptId,
            timestamp: new Date().toISOString(),
          })

          if (state.context.interactionTimestamp) {
            logInteraction(state.context.interactionTimestamp, 'client', 'Final stream completed', {
              scriptId: state.context.scriptId,
              timestamp: new Date().toISOString(),
            }).catch(console.error)
          }

          // Transition to complete state
          send({ type: 'START_STREAMING_FINAL' })
        }
      } catch (error) {
        // Skip processing if we're not mounted or aborted
        if (!isMounted || signal.aborted) {
          console.log('[FINAL_EFFECT_DEBUG] Ignoring error after unmount/abort:', error)
          return
        }

        // Check if it's an AbortError, which is expected during normal cleanup
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.log('[FINAL_EFFECT_DEBUG] Final generation was aborted normally')
        } else {
          console.error('[FINAL_EFFECT_DEBUG] Final generation threw error:', error)
          if (state.context.interactionTimestamp) {
            logInteraction(state.context.interactionTimestamp, 'client', 'Final generation error', {
              error: error instanceof Error ? error.message : 'Unknown error',
              scriptId: state.context.scriptId,
              timestamp: new Date().toISOString(),
            }).catch(console.error)
          }

          // Only send error if still in final state
          if (state.matches('generatingFinal')) {
            send({
              type: 'SET_ERROR',
              error: error instanceof Error ? error.message : 'Error generating final script',
            })
          }
        }
      } finally {
        // Reset streaming state if we're still mounted
        if (isMounted) {
          isStreamingRef.current = false
          console.log(
            '[FINAL_EFFECT_DEBUG] Final streaming complete, received total chunks:',
            chunksReceived
          )
        }
      }
    }

    // Start the final generation process
    startFinalGeneration()

    // Clean up function
    return () => {
      console.log('[FINAL_EFFECT_DEBUG] Cleaning up final generation effect', {
        totalChunks: chunksReceived,
        scriptId: state.context.scriptId,
        timestamp: new Date().toISOString(),
      })

      // Mark component as unmounted to prevent state updates
      isMounted = false

      // Only abort the controller if it hasn't been aborted yet
      if (finalGenerationControllerRef.current === controller) {
        console.log('[FINAL_EFFECT_DEBUG] Aborting controller during cleanup', {
          scriptId: state.context.scriptId,
          timestamp: new Date().toISOString(),
        })
        try {
          // Check if not already aborted before attempting to abort
          if (!controller.signal.aborted) {
            controller.abort()
          } else {
            console.log('[FINAL_EFFECT_DEBUG] Controller already aborted, skipping abort call')
          }
        } catch (error) {
          console.warn('[FINAL_EFFECT_DEBUG] Error aborting controller:', error)
        } finally {
          // Always clear the controller reference in cleanup
          finalGenerationControllerRef.current = null
        }
      }
    }
  }, [
    // Only re-run when scriptId, state or other essentials change
    state.matches,
    state.context.scriptId,
    state.context.prompt,
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

        // Use revealLineInCenter if available for better visibility
        if (typeof editor.revealLineInCenter === 'function') {
          editor.revealLineInCenter(lineCount)
          console.log('[EDITOR_SCROLL] Revealed line in center:', lineCount)
        } else {
          editor.revealLine(lineCount)
          console.log('[EDITOR_SCROLL] Revealed line (fallback):', lineCount)
        }

        // Force a focus on the editor to ensure scrolling works properly
        try {
          // This is a hack to ensure the editor properly scrolls
          setTimeout(() => {
            if (editor && typeof editor.revealLineInCenter === 'function') {
              editor.revealLineInCenter(lineCount)
            } else if (editor) {
              editor.revealLine(lineCount)
            }
          }, 10)
        } catch (error) {
          console.warn('[EDITOR_SCROLL] Error during scroll:', error)
        }
      }
    }
  }, [state.context.editableScript, state.matches])

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

  // Watch for suggestion selection and trigger generation
  useEffect(() => {
    console.log('[SUGGESTION EFFECT] Suggestion effect triggered:', {
      isFromSuggestion: state.context.isFromSuggestion,
      promptLength: state.context.prompt.trim().length,
      isAuthenticated,
      isInGeneratingState:
        state.matches('thinkingDraft') ||
        state.matches('generatingDraft') ||
        state.matches('generatingFinal'),
      timestamp: new Date().toISOString(),
    })

    // Only proceed if all conditions are met:
    // 1. Prompt was set from a suggestion
    // 2. Prompt is long enough to be valid
    // 3. User is authenticated
    // 4. We're not already in a generation state
    if (
      state.context.isFromSuggestion &&
      state.context.prompt.trim().length >= 15 &&
      isAuthenticated &&
      !state.matches('thinkingDraft') &&
      !state.matches('generatingDraft') &&
      !state.matches('generatingFinal')
    ) {
      console.log('[SUGGESTION EFFECT] Auto-triggering generation from suggestion')

      // Use a slight delay to ensure state has settled
      const triggerTimeout = setTimeout(() => {
        // Double-check we're still in a valid state before triggering
        if (
          state.context.isFromSuggestion &&
          !state.matches('thinkingDraft') &&
          !state.matches('generatingDraft') &&
          !state.matches('generatingFinal')
        ) {
          console.log('[SUGGESTION EFFECT] Dispatching GENERATE_DRAFT after delay')

          // Use the existing timestamp if available or create a new one
          const interactionTimestamp =
            state.context.interactionTimestamp ||
            new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')

          send({ type: 'GENERATE_DRAFT', timestamp: interactionTimestamp })

          // Reset the isFromSuggestion flag to prevent re-triggering
          send({ type: 'FROM_SUGGESTION', value: false })
        } else {
          console.log('[SUGGESTION EFFECT] State changed during delay, generation not triggered')
        }
      }, 50) // Short delay to ensure state consistency

      // Clean up timeout if component unmounts or dependencies change
      return () => clearTimeout(triggerTimeout)
    }
  }, [state.context.isFromSuggestion, state.context.prompt, isAuthenticated, state.matches, send])

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
            suggestions={suggestions}
            setPrompt={prompt => {
              send({ type: 'SET_PROMPT', prompt })
            }}
            setIsFromSuggestion={value => {
              send({ type: 'FROM_SUGGESTION', value })
            }}
            onSelect={() => {
              // Only proceed if user is authenticated
              if (!isAuthenticated) {
                showSignInModal()
                return
              }

              // Generate a timestamp for the interaction
              const interactionTimestamp = new Date()
                .toISOString()
                .replace(/[:.]/g, '-')
                .replace('Z', '')

              // Trigger generation immediately
              send({ type: 'GENERATE_DRAFT', timestamp: interactionTimestamp })

              // Reset isFromSuggestion to prevent duplicate generation from the useEffect
              send({ type: 'FROM_SUGGESTION', value: false })
            }}
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

                  {/* Show spinner overlay when in generatingFinal state and no content yet */}
                  {state.matches('generatingFinal') &&
                    (!state.context.editableScript ||
                      state.context.editableScript.trim() === '') && (
                      <div className="absolute inset-0 bg-zinc-900/80 flex items-center justify-center z-10">
                        <Loader2 className="h-12 w-12 animate-spin text-amber-400" />
                      </div>
                    )}
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
        isTransitioningToFinal={state.context.isTransitioningToFinal}
        error={state.context.error}
      />
    </div>
  )
}
