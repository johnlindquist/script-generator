/**
 * Test script for OpenRouter integration with reasoning extraction using direct API calls
 * and manual extraction
 *
 * This script demonstrates how to extract reasoning details from OpenRouter API responses
 * using direct API calls and manual extraction.
 *
 * Usage:
 * pnpm node scripts/test-openrouter-reasoning-direct-manual.ts
 *
 * Note: This requires proper environment variables.
 * Make sure OPENROUTER_API_KEY and OPENROUTER_DEFAULT_MODEL are set.
 */

import 'dotenv/config'

/**
 * Interface for the result of reasoning extraction
 */
interface ReasoningResult {
  /** The final response text with reasoning removed */
  text: string
  /** The extracted reasoning text */
  reasoning: string
  /** Whether reasoning was successfully extracted */
  hasReasoning: boolean
}

/**
 * Manually extracts reasoning from a response string
 *
 * @param response - The full response text
 * @param tagName - The XML tag name used for reasoning (default: 'reasoning')
 * @returns An object containing the extracted reasoning and the text without reasoning
 */
function extractReasoningManually(
  response: string,
  tagName: string = 'reasoning'
): ReasoningResult {
  // Create regex pattern based on the tag name
  const reasoningRegex = new RegExp(`<${tagName}>([\\\s\\\S]*?)<\/${tagName}>`, 'g')

  // Extract all reasoning sections
  const reasoningMatches = [...response.matchAll(reasoningRegex)]
  const extractedReasoning = reasoningMatches.map(match => match[1]).join('\n\n')

  // Remove reasoning sections from the response
  const textWithoutReasoning = response.replace(reasoningRegex, '').trim()

  return {
    text: textWithoutReasoning,
    reasoning: extractedReasoning,
    hasReasoning: extractedReasoning.length > 0,
  }
}

/**
 * Enhances a prompt to request reasoning in XML tags
 *
 * @param prompt - The original prompt
 * @param tagName - The XML tag name to use for reasoning (default: 'reasoning')
 * @returns The enhanced prompt with reasoning instructions
 */
function enhancePromptWithReasoningRequest(prompt: string, tagName: string = 'reasoning'): string {
  return `${prompt.trim()}

IMPORTANT: Please include your step-by-step reasoning process inside <${tagName}>...</${tagName}> XML tags. 
This helps me understand your thought process. After your reasoning, provide a concise summary of your answer.`
}

/**
 * Extracts a summary from reasoning text
 *
 * @param reasoning - The extracted reasoning text
 * @param maxLines - Maximum number of lines to include in the summary (default: 3)
 * @returns A summary extracted from the reasoning
 */
function extractSummaryFromReasoning(reasoning: string, maxLines: number = 3): string {
  if (!reasoning) return ''

  // Extract a summary from the reasoning by taking the last few lines
  const summaryLines = reasoning
    .split('\n')
    .filter(line => line.trim().length > 0)
    .slice(-maxLines)

  return summaryLines.join('\n')
}

async function testOpenRouterWithReasoningDirectManual() {
  console.log(
    '🚀 Testing OpenRouter API with reasoning extraction (direct API call + manual extraction)...'
  )

  const apiKey = process.env.OPENROUTER_API_KEY
  const modelName = process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3-5-sonnet'

  if (!apiKey) {
    console.error('❌ Missing OPENROUTER_API_KEY environment variable')
    process.exit(1)
  }

  try {
    console.log(`📝 Using model: ${modelName}`)
    console.log(`🔑 API Key (first 4 chars): ${apiKey.substring(0, 4)}...`)

    // Original prompt
    const originalPrompt = `
Analyze the following code snippet and explain what it does.

\`\`\`typescript
function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
\`\`\`
`

    // Enhanced prompt with reasoning request
    const enhancedPrompt = enhancePromptWithReasoningRequest(originalPrompt)

    console.log('📤 Original prompt:')
    console.log(originalPrompt)

    console.log('\n📤 Enhanced prompt:')
    console.log(enhancedPrompt)

    console.log('\n⏳ Sending prompt to OpenRouter API...')
    const startTime = Date.now()

    // Use the OpenRouter API directly
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://script-generator.vercel.app',
        'X-Title': 'Script Generator',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: enhancedPrompt }],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenRouter API error: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    const fullResponse = result.choices[0].message.content

    const endTime = Date.now()
    console.log('\n\n⏱️ Time taken:', (endTime - startTime) / 1000, 'seconds')
    console.log('🎉 API call completed successfully!')

    // Display the full response
    console.log('\n\n📄 FULL RESPONSE:')
    console.log('===========================================')
    console.log(fullResponse)
    console.log('===========================================')
    console.log(`📏 Response length: ${fullResponse.length} characters`)

    // Extract reasoning manually
    console.log('\n⏳ Extracting reasoning manually...')
    const extractionStartTime = Date.now()

    // Extract reasoning manually
    const { text, reasoning, hasReasoning } = extractReasoningManually(fullResponse)

    const extractionEndTime = Date.now()
    console.log('⏱️ Time taken:', (extractionEndTime - extractionStartTime) / 1000, 'seconds')

    // Display the extracted reasoning
    console.log('\n\n🧠 EXTRACTED REASONING:')
    console.log('===========================================')
    console.log(reasoning || 'No reasoning extracted')
    console.log('===========================================')
    console.log(`📏 Reasoning length: ${reasoning?.length || 0} characters`)
    console.log(`🔍 Has reasoning: ${hasReasoning}`)

    // Display the final answer (everything outside the reasoning tags)
    console.log('\n\n📝 FINAL ANSWER (without reasoning):')
    console.log('===========================================')
    console.log(text || 'No final answer extracted')
    console.log('===========================================')
    console.log(`📏 Final answer length: ${text?.length || 0} characters`)

    // Extract summary from reasoning
    if (hasReasoning) {
      console.log('\n⏳ Extracting summary from reasoning...')
      const summaryStartTime = Date.now()

      // Extract summary from reasoning
      const summary = extractSummaryFromReasoning(reasoning, 3)

      const summaryEndTime = Date.now()
      console.log('⏱️ Time taken:', (summaryEndTime - summaryStartTime) / 1000, 'seconds')

      // Display the results
      console.log('\n📝 SUMMARY FROM REASONING:')
      console.log('===========================================')
      console.log(summary || 'No summary extracted')
      console.log('===========================================')
      console.log(`📏 Summary length: ${summary?.length || 0} characters`)
    }

    return { fullResponse, reasoning, text, hasReasoning }
  } catch (error) {
    console.error('❌ Test failed:', error)
    console.error('Error details:', error instanceof Error ? error.stack : String(error))
    process.exit(1)
  }
}

// Run the test
testOpenRouterWithReasoningDirectManual().catch(error => {
  console.error('❌ Unhandled error:', error)
  console.error('Error details:', error instanceof Error ? error.stack : String(error))
  process.exit(1)
})
