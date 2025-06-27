'use client'

import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { useNextSuggestions } from '@/hooks/useNextSuggestions'
import { cn } from '@/lib/utils'
import { logInteraction } from '@/lib/interaction-logger'
import { ChevronRight, RotateCcw, ArrowLeft, Trash2, Zap } from 'lucide-react'

interface Props {
  prompt: string
  setPrompt: (prompt: string) => void
  onGenerate?: () => void
  isAuthenticated: boolean
  maxDepth?: number
  showSignInModal: () => void
}

export default function AIPromptBuilder(props: Props) {
  const { prompt, setPrompt, onGenerate, isAuthenticated, maxDepth = 5, showSignInModal } = props // Default maxDepth to 5 as per mock
  const [breadcrumb, setBreadcrumb] = useState<string>('')
  const [tier, setTier] = useState(1)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [sessionInteractionId, setSessionInteractionId] = useState<string>('')

  useEffect(() => {
    setSessionInteractionId(new Date().toISOString().replace(/[:.]/g, '-').replace('Z', ''))
  }, [])

  const {
    suggestions: suggestionsData,
    error: suggestionsError,
    isLoading: suggestionsIsLoading,
  } = useNextSuggestions(breadcrumb, sessionInteractionId, refreshVersion)

  useEffect(() => {
    if (tier >= maxDepth && onGenerate && isAuthenticated) {
      onGenerate()
    }
  }, [tier, onGenerate, isAuthenticated, maxDepth])

  const handleSelectSuggestion = (suggestion: string): void => {
    if (!sessionInteractionId) return

    if (!isAuthenticated) {
      showSignInModal()
      return
    }

    logInteraction(sessionInteractionId, 'client', 'AIPromptBuilder: handleChoose called', {
      btnText: suggestion,
      currentTier: tier,
      currentBreadcrumb: breadcrumb,
      currentPrompt: prompt,
    })

    const newPrompt = prompt ? `${prompt} ${suggestion.toLowerCase()}` : suggestion.toLowerCase()
    setPrompt(newPrompt)

    const newBreadcrumb = breadcrumb ? `${breadcrumb} → ${suggestion}` : suggestion
    setBreadcrumb(newBreadcrumb)
    setTier(tier + 1)

    logInteraction(sessionInteractionId, 'client', 'AIPromptBuilder: state updated after choice', {
      newPrompt,
      newBreadcrumb,
      newTier: tier + 1,
    })
  }

  const handleBack = (): void => {
    if (breadcrumb) {
      const newBreadcrumb = breadcrumb.split(' → ').slice(0, -1).join(' → ')
      setBreadcrumb(newBreadcrumb)
      setTier(Math.max(1, tier - 1))

      const newPrompt = newBreadcrumb
        .split(' → ')
        .map(item => item.toLowerCase())
        .join(' ')
      setPrompt(newPrompt)
    }
  }

  const handleReset = (): void => {
    setBreadcrumb('')
    setTier(1)
    setPrompt('')
  }

  const refresh = () => setRefreshVersion(Date.now())

  const initialCategories: string[] = [
    'AI',
    'Files',
    'Clipboard',
    'System',
    'Network',
    'Text',
    'Images',
    'Audio',
    'Video',
    'serverRoute',
    'Editor',
    'Terminal',
  ]

  const currentSuggestions: string[] = tier === 1 ? initialCategories : suggestionsData || []

  return (
    <div className="relative border border-white/10 rounded-xl bg-white/5 p-6 space-y-6 shadow-lg">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Script Idea Generator</h2>
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">
          Not sure what you need? Try these suggestions!
        </p>
      </div>

      {/* Action Suggestion Pills */}
      <div
        className={cn(
          'relative flex flex-wrap justify-center gap-2 min-h-[60px]' // Added relative, removed opacity-50
        )}
      >
        {currentSuggestions.length > 0 ? (
          currentSuggestions.map((suggestion: string, index: number) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => handleSelectSuggestion(suggestion)}
              disabled={suggestionsIsLoading && tier > 1} // Keep disabled for individual buttons
              className="h-8 px-3 text-xs rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-primary/50 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {suggestion}
              {tier >= maxDepth && <span className="ml-1.5 text-xs opacity-80">→ Generate</span>}
            </Button>
          ))
        ) : suggestionsError && !suggestionsIsLoading ? (
          <div className="text-sm text-destructive w-full text-center flex items-center justify-center">
            Failed to load suggestions. Please try again.
          </div>
        ) : (
          !suggestionsIsLoading && (
            <div className="text-sm text-muted-foreground w-full text-center flex items-center justify-center">
              {tier === 1
                ? 'Select a category above to see suggestions.'
                : 'No suggestions here. Try the refresh button or go back.'}
            </div>
          )
        )}
        {/* Loading Overlay - MOVED HERE and constrained to this pills area */}
        {suggestionsIsLoading && tier > 1 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10 rounded-lg">
            {' '}
            {/* Adjusted rounding to fit pills area if needed */}
            <div className="flex items-center gap-2 text-sm text-white">
              <RotateCcw className="w-4 h-4 animate-spin" />
              <span>Generating new ideas...</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Controls and Step Indicator */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            disabled={tier === 1}
            title="Back"
            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            disabled={tier === 1 && !breadcrumb}
            title="Reset"
            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={refresh}
            title="New ideas"
            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-primary/50" title={`Current Step: ${tier}`} />
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Step {tier} of {maxDepth - 1}
          </span>
        </div>
      </div>

      {/* Path indicator */}
      {breadcrumb && (
        <div className="flex items-center gap-1.5 text-sm pt-1">
          <span className="font-semibold text-foreground/80 whitespace-nowrap pl-1">Path:</span>
          {breadcrumb.split(' → ').map((item: string, index: number) => (
            <React.Fragment key={index}>
              <span className="bg-white/5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap text-foreground/90 shadow-sm">
                {item}
              </span>
              {index < breadcrumb.split(' → ').length - 1 && (
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  )
}
