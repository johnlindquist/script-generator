/**
 * Test script for OpenRouter integration with reasoning extraction
 *
 * This script demonstrates how to extract reasoning details from OpenRouter API responses
 * using the Vercel AI SDK middleware.
 *
 * Usage:
 * pnpm node scripts/test-openrouter-reasoning.ts
 *
 * Note: This requires proper environment variables.
 * Make sure OPENROUTER_API_KEY and OPENROUTER_DEFAULT_MODEL are set.
 */

import 'dotenv/config'
import { wrapLanguageModel, extractReasoningMiddleware, generateText } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'

async function testOpenRouterWithReasoning() {
  console.log('🚀 Testing OpenRouter API with reasoning extraction...')

  const apiKey = process.env.OPENROUTER_API_KEY
  const modelName = process.env.OPENROUTER_DEFAULT_MODEL || 'openai/gpt-5'

  if (!apiKey) {
    console.error('❌ Missing OPENROUTER_API_KEY environment variable')
    process.exit(1)
  }

  try {
    console.log(`📝 Using model: ${modelName}`)
    console.log(`🔑 API Key (first 4 chars): ${apiKey.substring(0, 4)}...`)

    // Create OpenRouter instance
    const openrouter = createOpenRouter({
      apiKey: apiKey,
    })

    // Create a wrapped model with reasoning extraction middleware
    const modelWithReasoning = wrapLanguageModel({
      model: openrouter(modelName),
      middleware: extractReasoningMiddleware({ tagName: 'reasoning' }),
    })

    // Prompt that explicitly asks for reasoning in XML tags
    const prompt = `
Please analyze the following code snippet and explain what it does.
Use <reasoning>...</reasoning> tags to show your step-by-step analysis.
After your reasoning, provide a concise summary of what the function does.

\`\`\`typescript
function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
\`\`\`
`

    console.log('📤 Sending prompt with reasoning request...')
    console.log(prompt)

    const startTime = Date.now()

    // Generate text with reasoning extraction
    const { text, reasoning } = await generateText({
      model: modelWithReasoning,
      prompt,
    })

    const endTime = Date.now()
    console.log('\n\n⏱️ Time taken:', (endTime - startTime) / 1000, 'seconds')
    console.log('🎉 Test completed successfully!')

    // Display the full response
    console.log('\n\n📄 FINAL RESPONSE:')
    console.log('===========================================')
    console.log(text || 'No final response text (all content was in reasoning)')
    console.log('===========================================')
    console.log(`📏 Response length: ${text?.length || 0} characters`)

    // Display the extracted reasoning
    console.log('\n\n🧠 EXTRACTED REASONING:')
    console.log('===========================================')
    console.log(reasoning || 'No reasoning extracted')
    console.log('===========================================')
    console.log(`📏 Reasoning length: ${reasoning?.length || 0} characters`)

    // If the final response is empty but reasoning exists, create a combined response
    if ((!text || text.trim() === '') && reasoning) {
      console.log('\n\n⚠️ Final response was empty but reasoning was extracted.')
      console.log('This suggests the model put all its content inside the reasoning tags.')
      console.log("Here's a summary based on the reasoning:")

      // Extract a summary from the reasoning
      const summaryLines = reasoning
        .split('\n')
        .filter(line => line.trim().length > 0)
        .slice(-3) // Get the last few lines as a summary

      console.log('\n📝 SUMMARY FROM REASONING:')
      console.log('===========================================')
      console.log(summaryLines.join('\n'))
      console.log('===========================================')
    }

    return { text, reasoning }
  } catch (error) {
    console.error('❌ Test failed:', error)
    console.error('Error details:', error instanceof Error ? error.stack : String(error))
    process.exit(1)
  }
}

// Run the test
testOpenRouterWithReasoning().catch(error => {
  console.error('❌ Unhandled error:', error)
  console.error('Error details:', error instanceof Error ? error.stack : String(error))
  process.exit(1)
})
