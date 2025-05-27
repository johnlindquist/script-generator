import { NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { z } from 'zod'
import { gateway } from '@/lib/ai-gateway'
import { logInteraction } from '@/lib/interaction-logger'

export const runtime = 'nodejs'

const DEFAULT_MODEL = 'openai/gpt-4.1-mini'

// Define the Zod schema for the expected suggestions
const SuggestionsSchema = z.object({
  suggestions: z
    .array(z.string().min(1, 'Suggestion cannot be empty.'))
    .length(5, 'Must provide exactly five suggestions.')
    .refine(arr => arr.every(s => s.trim().length > 0), {
      message: 'All suggestions must be non-empty strings.',
    }),
})

const baseSystemPrompt = String.raw`You are a UX copywriter for a Script Kit wizard.
Your task is to provide exactly five short, human-readable, title-cased suggestions based on the user's current path in the wizard.

Guidelines for suggestions:
1. Three suggestions should continue down the current path, building on the user's previous choices and the current context.
2. Two suggestions should be branches for ai, prompts, and other Script Kit features in case the user wants to go in a different direction.

Return the suggestions as a JSON object matching the following schema:
{
  "type": "object",
  "properties": {
    "suggestions": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 5,
      "maxItems": 5
    }
  },
  "required": ["suggestions"]
}

Ensure each suggestion is concise and relevant to the provided path for the on-path suggestions, and genuinely diverse and exploratory for the off-ramp suggestions, adhering to the 3-on-path and 2-off-ramp structure.
You are currently at step {currentStep} of a maximum {maxDepth}.`

// Base prompt for user message content
const baseUserPrompt = String.raw`
Current path chosen so far: {breadcrumb}

Provide five suggestions for the next step, following the 3-on-path and 2-off-ramp guideline. The off-ramp suggestions should explore different Script Kit APIs.
`

export async function POST(req: Request) {
  let sessionInteractionId: string | undefined

  try {
    const body = await req.json()
    const breadcrumb = body.breadcrumb as string
    sessionInteractionId = body.sessionInteractionId as string
    const currentStep = body.currentStep as number
    const maxDepth = body.maxDepth as number

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

    let errorDetails: {
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
