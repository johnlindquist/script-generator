import { NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { z } from 'zod'
import { gateway } from '@/lib/ai-gateway'
import { logInteraction } from '@/lib/interaction-logger'
import { NextSuggestionsSchema } from '@/lib/schemas'
import type { GatewayModelId } from '@ai-sdk/gateway'

export const runtime = 'nodejs'

const DEFAULT_MODEL: GatewayModelId =
  (process.env.SUGGESTIONS_AI_MODEL as GatewayModelId) || 'openai/gpt-5-nano'

// Log model configuration on startup
console.log('[SUGGESTIONS API] Model Configuration:', {
  SUGGESTIONS_AI_MODEL: process.env.SUGGESTIONS_AI_MODEL || '(not set)',
  DEFAULT_MODEL,
  fallbackUsed: !process.env.SUGGESTIONS_AI_MODEL,
})

// Define the Zod schema for the expected suggestions
const SuggestionsSchema = z.object({
  suggestions: z
    .array(z.string().min(1, 'Suggestion cannot be empty.'))
    .length(5, 'Must provide exactly five suggestions.')
    .refine(arr => arr.every(s => s.trim().length > 0), {
      message: 'All suggestions must be non-empty strings.',
    }),
})

const baseSystemPrompt = String.raw`You are a UX copywriter for an automation script wizard.
Provide exactly 5 short, title-cased button labels for the next step.

Rules:
- 3 suggestions continue the current path
- 2 suggestions offer completely different directions
- Keep each under 6 words
- Think: files, text, clipboard, web, system, AI, data, images

Step {currentStep}/{maxDepth}`

// Base prompt for user message content
const baseUserPrompt = String.raw`Path: {breadcrumb}

Generate 5 next-step suggestions.`

export async function POST(req: Request) {
  let sessionInteractionId: string | undefined

  try {
    const rawBody = await req.json()
    const parseResult = NextSuggestionsSchema.safeParse(rawBody)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.errors },
        { status: 400 }
      )
    }

    const body = parseResult.data
    const breadcrumb = body.breadcrumb || ''
    sessionInteractionId = body.sessionInteractionId
    const currentStep = body.currentStep || 0
    const maxDepth = body.maxDepth || 10

    if (!sessionInteractionId) {
      console.warn(
        'next-suggestions API: sessionInteractionId not provided in request. Generating temporary ID.'
      )
      sessionInteractionId = `temp-${new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')}`
    }

    logInteraction(sessionInteractionId, 'serverRoute', 'next-suggestions: route handler started', {
      receivedSessionId: !!body.sessionInteractionId,
    })

    logInteraction(sessionInteractionId, 'serverRoute', 'next-suggestions: received request', {
      breadcrumb,
      breadcrumbType: typeof breadcrumb,
      breadcrumbLength: breadcrumb?.length || 0,
      currentStep,
      maxDepth,
    })

    if (!breadcrumb || typeof breadcrumb !== 'string') {
      logInteraction(sessionInteractionId, 'serverRoute', 'next-suggestions: invalid breadcrumb', {
        breadcrumb,
        breadcrumbType: typeof breadcrumb,
      })
      return NextResponse.json({ error: 'Invalid breadcrumb' }, { status: 400 })
    }
    logInteraction(sessionInteractionId, 'serverRoute', 'next-suggestions: breadcrumb validated', {
      breadcrumb,
    })

    const userPromptContent = baseUserPrompt.replace('{breadcrumb}', breadcrumb)
    const systemPrompt = baseSystemPrompt
      .replace('{currentStep}', String(currentStep))
      .replace('{maxDepth}', String(maxDepth))

    console.log('[SUGGESTIONS API] Generating suggestions with model:', {
      model: DEFAULT_MODEL,
      breadcrumb,
      currentStep,
      maxDepth,
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPromptContent.length,
      totalPromptSize: `${Math.round((systemPrompt.length + userPromptContent.length) / 1024)}KB`,
    })

    console.log('[SUGGESTIONS API] System Prompt:', {
      prompt: systemPrompt,
    })

    console.log('[SUGGESTIONS API] User Prompt:', {
      prompt: userPromptContent,
    })

    logInteraction(
      sessionInteractionId,
      'serverRoute',
      'next-suggestions: calling AI model for object generation',
      {
        breadcrumb,
        model: DEFAULT_MODEL,
        systemPromptLength: systemPrompt.length,
        userPromptLength: userPromptContent.length,
        currentStep,
        maxDepth,
      }
    )

    const result = await generateObject({
      model: gateway.languageModel(DEFAULT_MODEL),
      schema: SuggestionsSchema,
      prompt: userPromptContent,
      system: systemPrompt,
      temperature: 0.6, // Slightly increased temperature for more varied off-ramp suggestions
      maxRetries: 2,
    })

    logInteraction(
      sessionInteractionId,
      'serverRoute',
      'next-suggestions: generateObject call completed',
      {
        breadcrumb,
        object: result.object,
        finishReason: result.finishReason,
        usage: result.usage,
      }
    )

    let finalSuggestions = result.object.suggestions

    if (!finalSuggestions || finalSuggestions.length !== 5) {
      logInteraction(
        sessionInteractionId,
        'serverRoute',
        'next-suggestions: AI returned invalid object or wrong number of suggestions, attempting fallback',
        {
          breadcrumb,
          receivedObject: result.object,
        }
      )

      const onPathFallback = [
        `Continue with ${breadcrumb.split(' → ').pop() || 'Task'}`,
        `Refine ${breadcrumb.split(' → ').pop() || 'Last Step'}`,
        `More options for ${breadcrumb.split(' → ').pop() || 'Current Topic'}`,
      ].slice(0, 3)

      const offRampFallback = [
        'Explore Image Utilities',
        'Manage System Settings',
        'Work with APIs',
        'Use Clipboard History',
        'Run a Shell Command',
      ]
      // Shuffle offRampFallback to get varied suggestions each time
      const shuffledOffRamps = offRampFallback.sort(() => 0.5 - Math.random())

      finalSuggestions = [...onPathFallback, ...shuffledOffRamps.slice(0, 2)]
      finalSuggestions = finalSuggestions.slice(0, 5) // Ensure exactly 5

      logInteraction(
        sessionInteractionId,
        'serverRoute',
        'next-suggestions: using fallback suggestions',
        {
          breadcrumb,
          fallbackSuggestions: finalSuggestions,
        }
      )
    }

    logInteraction(
      sessionInteractionId,
      'serverRoute',
      'next-suggestions: processed suggestions, preparing response',
      {
        breadcrumb,
        finalSuggestionsCount: finalSuggestions.length,
        finalSuggestions: finalSuggestions,
        usedFallback: finalSuggestions !== result.object.suggestions,
        aiResponseWasEmpty: !result.object.suggestions || result.object.suggestions.length === 0,
        originalSuggestionsFromAI: result.object.suggestions,
      }
    )

    return NextResponse.json({ suggestions: finalSuggestions })
  } catch (error) {
    const idForErrorLog =
      sessionInteractionId ||
      `error-${new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')}`
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    const errorName = error instanceof Error ? error.name : 'UnknownError'

    const errorDetails: {
      error: string
      stack?: string
      errorType: string
      errorName: string
      apiError?: { url: unknown; statusCode: unknown; responseBody: unknown }
    } = {
      error: errorMessage,
      stack: errorStack,
      errorType: typeof error,
      errorName: errorName,
    }

    if (
      error &&
      typeof error === 'object' &&
      'url' in error &&
      'statusCode' in error &&
      'responseBody' in error
    ) {
      errorDetails.apiError = {
        url: (error as { url: unknown }).url,
        statusCode: (error as { statusCode: unknown }).statusCode,
        responseBody: (error as { responseBody: unknown }).responseBody,
      }
    }

    logInteraction(
      idForErrorLog,
      'serverRoute',
      'next-suggestions: critical error occurred',
      errorDetails
    )

    console.error('Error generating next suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to generate suggestions', details: errorMessage },
      { status: 500 }
    )
  }
}
