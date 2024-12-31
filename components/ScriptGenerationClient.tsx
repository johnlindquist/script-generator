'use client'

import { useRef, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { Editor } from '@monaco-editor/react'
import { monacoOptions, initializeTheme } from '@/lib/monaco'
import {
  RocketLaunchIcon,
  DocumentCheckIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
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
  const [state, send] = useMachine(scriptGenerationMachine)

  const editorRef = useRef<EditorRef | null>(null)

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
  const generationPass = state.matches('generatingInitial')
    ? 'initial'
    : state.matches('generatingRefined')
      ? 'refining'
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

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold mb-6 text-center min-h-[32px]">
        {isGenerating ? (
          <AnimatedText
            text={
              generationPass === 'initial'
                ? STRINGS.SCRIPT_GENERATION.headingWhileGenerating
                : STRINGS.SCRIPT_GENERATION.headingWhileRefining
            }
          />
        ) : state.context.generatedScript ? (
          STRINGS.SCRIPT_GENERATION.headingDone
        ) : (
          STRINGS.SCRIPT_GENERATION.headingDefault
        )}
      </h2>
      {!state.context.generatedScript && !isGenerating && (
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <textarea
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
                isGenerating ||
                state.context.prompt.trim().length < 15 ||
                state.context.usageCount === state.context.usageLimit
              }
              className="flex items-center gap-2 bg-amber-400 text-black px-6 py-2 rounded-lg font-medium hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {!isAuthenticated ? (
                STRINGS.SCRIPT_GENERATION.signInToGenerate
              ) : state.context.usageCount === state.context.usageLimit ? (
                STRINGS.SCRIPT_GENERATION.dailyLimitReached
              ) : isGenerating ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  <AnimatedText text={STRINGS.SCRIPT_GENERATION.generating} />
                </>
              ) : (
                <>
                  {STRINGS.SCRIPT_GENERATION.generateScript}
                  <RocketLaunchIcon className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {isAuthenticated && !state.context.generatedScript && !isGenerating && (
        <div className="pt-4">
          <hr className="border-amber-400/20 my-4" />
          <h3 className="text-lg mb-4 text-center">
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

      {(isGenerating || state.context.generatedScript) && (
        <div className="mt-8">
          <div className="relative mb-2 max-w-4xl mx-auto">
            <div className="bg-zinc-900/90 rounded-lg overflow-hidden border border-amber-400/10 ring-1 ring-amber-400/20 shadow-amber-900/20">
              <div className="w-full h-[600px] relative">
                <Editor
                  height="100%"
                  defaultLanguage="typescript"
                  value={state.context.editableScript}
                  onChange={value =>
                    isAuthenticated && send({ type: 'UPDATE_EDITABLE_SCRIPT', script: value || '' })
                  }
                  options={{
                    ...monacoOptions,
                    readOnly: !isAuthenticated,
                    domReadOnly: !isAuthenticated,
                  }}
                  onMount={handleEditorDidMount}
                  beforeMount={initializeTheme}
                  theme="brillance-black"
                />
              </div>
            </div>
            {!isGenerating && (
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
