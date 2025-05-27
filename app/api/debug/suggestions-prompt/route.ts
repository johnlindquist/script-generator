import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logInteraction } from '@/lib/interaction-logger'
import { getScriptKitDocs } from '@/lib/scriptKitDocs'

export const runtime = 'nodejs'

const DEFAULT_MODEL = 'openai/gpt-4.1-mini'

// Use the same Zod schema as the real route
const SuggestionsSchema = z.object({
  suggestions: z
    .array(z.string().min(1, 'Suggestion cannot be empty.'))
    .length(5, 'Must provide exactly five suggestions.')
    .refine(arr => arr.every(s => s.trim().length > 0), {
      message: 'All suggestions must be non-empty strings.',
    }),
})

// Use the exact same prompts as the real route
const baseSystemPrompt = String.raw`You are a helping generate ideas for Script Kit scripts.
Your task is to provide exactly five short, human-readable, title-cased suggestions based on the user's current path in the wizard.

As a reminder, here's the basic Script Kit api:

<SCRIPT_KIT_DOCS>
${getScriptKitDocs()}
</SCRIPT_KIT_DOCS>

Guidelines for suggestions:
1. Three suggestions should continue down the current path, building on the user's previous choices and the current context.
2. Two suggestions should be branches for ai, prompts, terminal, editor, and other Script Kit features in case the user wants to go in a different direction.

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

const baseUserPrompt = String.raw`
Current path chosen so far: {breadcrumb}

Provide five suggestions for the next step, following the 3-on-path and 2-off-ramp guideline. The off-ramp suggestions should explore different Script Kit APIs.
`

export async function GET(req: Request) {
  let sessionInteractionId: string | undefined

  try {
    const { searchParams } = new URL(req.url)
    const breadcrumb = searchParams.get('breadcrumb') || 'File Operations → List Directory Contents'
    const currentStep = parseInt(searchParams.get('currentStep') || '2', 10)
    const maxDepth = parseInt(searchParams.get('maxDepth') || '5', 10)
    sessionInteractionId = searchParams.get('sessionInteractionId') || undefined

    if (!sessionInteractionId) {
      console.warn(
        'debug suggestions-prompt API: sessionInteractionId not provided in request. Generating temporary ID.'
      )
      sessionInteractionId = `debug-temp-${new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')}`
    }

    logInteraction(
      sessionInteractionId,
      'serverRoute',
      'debug suggestions-prompt: route handler started',
      {
        receivedSessionId: !!searchParams.get('sessionInteractionId'),
      }
    )

    logInteraction(
      sessionInteractionId,
      'serverRoute',
      'debug suggestions-prompt: received request',
      {
        breadcrumb,
        breadcrumbType: typeof breadcrumb,
        breadcrumbLength: breadcrumb?.length || 0,
        currentStep,
        maxDepth,
      }
    )

    if (!breadcrumb || typeof breadcrumb !== 'string') {
      logInteraction(
        sessionInteractionId,
        'serverRoute',
        'debug suggestions-prompt: invalid breadcrumb',
        {
          breadcrumb,
          breadcrumbType: typeof breadcrumb,
        }
      )
      return NextResponse.json({ error: 'Invalid breadcrumb' }, { status: 400 })
    }

    logInteraction(
      sessionInteractionId,
      'serverRoute',
      'debug suggestions-prompt: breadcrumb validated',
      {
        breadcrumb,
      }
    )

    // Generate the final prompts exactly as they would be sent to the AI (same logic as real route)
    const userPromptContent = baseUserPrompt.replace('{breadcrumb}', breadcrumb)
    const finalSystemPrompt = baseSystemPrompt
      .replace('{currentStep}', String(currentStep))
      .replace('{maxDepth}', String(maxDepth))

    // Generate fallback suggestions using the same logic as the real route
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
    // Shuffle offRampFallback to get varied suggestions each time (same as real route)
    const shuffledOffRamps = offRampFallback.sort(() => 0.5 - Math.random())
    const fallbackSuggestions = [...onPathFallback, ...shuffledOffRamps.slice(0, 2)].slice(0, 5)

    logInteraction(
      sessionInteractionId,
      'serverRoute',
      'debug suggestions-prompt: generated debug response',
      {
        breadcrumb,
        systemPromptLength: finalSystemPrompt.length,
        userPromptLength: userPromptContent.length,
        currentStep,
        maxDepth,
        model: DEFAULT_MODEL,
        fallbackSuggestionsCount: fallbackSuggestions.length,
      }
    )

    return NextResponse.json({
      systemPrompt: finalSystemPrompt,
      userPrompt: userPromptContent,
      schema: SuggestionsSchema.shape,
      fallbackSuggestions,
      metadata: {
        systemPromptLength: finalSystemPrompt.length,
        userPromptLength: userPromptContent.length,
        breadcrumbLength: breadcrumb.length,
        currentStep,
        maxDepth,
        model: DEFAULT_MODEL,
        temperature: 0.6,
        maxRetries: 2,
        scriptKitDocsIncluded: true,
        schemaValidation: {
          suggestionsArrayLength: 5,
          minSuggestionLength: 1,
          requiresNonEmptyStrings: true,
        },
      },
    })
  } catch (error) {
    const idForErrorLog =
      sessionInteractionId ||
      `debug-error-${new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')}`
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
      'debug suggestions-prompt: critical error occurred',
      errorDetails
    )

    console.error('Error in debug suggestions prompt route:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate debug prompt',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
