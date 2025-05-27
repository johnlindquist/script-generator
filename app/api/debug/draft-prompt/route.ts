import { NextResponse } from 'next/server'
import { DRAFT_PASS_PROMPT } from '../../generate-ai-gateway/prompt'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const prompt = searchParams.get('prompt') || 'Create a simple hello world script'

    // Fetch structured script kit docs (same as in generate-ai-gateway)
    let structuredScriptKitDocsContent = ''
    try {
      const origin = new URL(req.url).origin
      const scriptKitDocsUrl = new URL('/api/script-kit-docs', origin)
      const scriptKitDocsRes = await fetch(scriptKitDocsUrl.toString())
      if (scriptKitDocsRes.ok) {
        const docsData = await scriptKitDocsRes.json()
        structuredScriptKitDocsContent = JSON.stringify(docsData, null, 2)
      }
    } catch (error) {
      console.warn('Failed to fetch script kit docs for debug prompt:', error)
    }

    // Generate the final prompt exactly as it would be sent to the AI
    const finalPrompt = DRAFT_PASS_PROMPT.replace('{prompt}', prompt).replace(
      '{structured_script_kit_docs}',
      structuredScriptKitDocsContent
    )

    return NextResponse.json({
      finalPrompt,
      metadata: {
        promptLength: finalPrompt.length,
        userPromptLength: prompt.length,
        structuredDocsLength: structuredScriptKitDocsContent.length,
        hasStructuredDocs: !!structuredScriptKitDocsContent,
      },
    })
  } catch (error) {
    console.error('Error in debug draft prompt route:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate debug prompt',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
