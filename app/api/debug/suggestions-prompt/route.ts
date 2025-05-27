import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Copy the prompts from next-suggestions route for debugging
const baseSystemPrompt = String.raw`You are a UX copywriter for a Script Kit wizard.
Your task is to provide exactly five short, human-readable, title-cased suggestions based on the user's current path in the wizard.

Guidelines for suggestions:
1. Three suggestions should continue down the current path, building on the user's previous choices and the current context.
2. Two suggestions should be "off-ramps" that offer a completely different direction. These off-ramps should encourage exploration of *other distinct Script Kit APIs or functionalities* that are not directly related to the current path. Think broadly about what else a user might want to do with Script Kit, drawing inspiration from the full range of its capabilities documented in the Script Kit docs. For example, if the user is working with files, an off-ramp might suggest interacting with an external API, managing system processes, or manipulating clipboard content.

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
  try {
    const { searchParams } = new URL(req.url)
    const breadcrumb = searchParams.get('breadcrumb') || 'File Operations → List Directory Contents'
    const currentStep = parseInt(searchParams.get('currentStep') || '2', 10)
    const maxDepth = parseInt(searchParams.get('maxDepth') || '5', 10)

    // Generate the final prompts exactly as they would be sent to the AI
    const finalSystemPrompt = baseSystemPrompt
      .replace('{currentStep}', String(currentStep))
      .replace('{maxDepth}', String(maxDepth))

    const finalUserPrompt = baseUserPrompt.replace('{breadcrumb}', breadcrumb)

    return NextResponse.json({
      systemPrompt: finalSystemPrompt,
      userPrompt: finalUserPrompt,
      metadata: {
        systemPromptLength: finalSystemPrompt.length,
        userPromptLength: finalUserPrompt.length,
        breadcrumbLength: breadcrumb.length,
        currentStep,
        maxDepth,
        model: 'openai/gpt-4.1-mini',
        temperature: 0.6,
      },
    })
  } catch (error) {
    console.error('Error in debug suggestions prompt route:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate debug prompt',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
