/**
 * Test script for OpenRouter integration with reasoning extraction using direct API calls
 *
 * This script demonstrates how to extract reasoning details from OpenRouter API responses
 * using direct API calls without the Vercel AI SDK middleware.
 *
 * Usage:
 * pnpm node scripts/test-openrouter-reasoning-direct.ts
 *
 * Note: This requires proper environment variables.
 * Make sure OPENROUTER_API_KEY and OPENROUTER_DEFAULT_MODEL are set.
 */

import 'dotenv/config'

async function testOpenRouterWithReasoningDirect() {
  console.log('🚀 Testing OpenRouter API with reasoning extraction (direct API call)...')

  const apiKey = process.env.OPENROUTER_API_KEY
  const modelName = process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3-5-sonnet'

  if (!apiKey) {
    console.error('❌ Missing OPENROUTER_API_KEY environment variable')
    process.exit(1)
  }

  try {
    console.log(`📝 Using model: ${modelName}`)
    console.log(`🔑 API Key (first 4 chars): ${apiKey.substring(0, 4)}...`)

    // Prompt that explicitly asks for reasoning in XML tags
    const prompt = `
Please analyze the following code snippet and explain what it does.
Use <reasoning>...</reasoning> tags to show your step-by-step analysis.

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
        messages: [{ role: 'user', content: prompt }],
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
    console.log('🎉 Test completed successfully!')

    // Display the full response
    console.log('\n\n📄 FULL RESPONSE:')
    console.log('===========================================')
    console.log(fullResponse)
    console.log('===========================================')
    console.log(`📏 Response length: ${fullResponse.length} characters`)

    // Extract reasoning manually using regex
    const reasoningRegex = /<reasoning>([\s\S]*?)<\/reasoning>/g
    const reasoningMatches = [...fullResponse.matchAll(reasoningRegex)]
    const extractedReasoning = reasoningMatches.map(match => match[1]).join('\n\n')

    // Display the extracted reasoning
    console.log('\n\n🧠 EXTRACTED REASONING:')
    console.log('===========================================')
    console.log(extractedReasoning || 'No reasoning extracted')
    console.log('===========================================')
    console.log(`📏 Reasoning length: ${extractedReasoning.length} characters`)

    // Extract the final answer (everything outside the reasoning tags)
    const finalAnswer = fullResponse.replace(reasoningRegex, '').trim()

    console.log('\n\n📝 FINAL ANSWER (without reasoning):')
    console.log('===========================================')
    console.log(finalAnswer)
    console.log('===========================================')
    console.log(`📏 Final answer length: ${finalAnswer.length} characters`)

    return { fullResponse, reasoning: extractedReasoning, finalAnswer }
  } catch (error) {
    console.error('❌ Test failed:', error)
    console.error('Error details:', error instanceof Error ? error.stack : String(error))
    process.exit(1)
  }
}

// Run the test
testOpenRouterWithReasoningDirect().catch(error => {
  console.error('❌ Unhandled error:', error)
  console.error('Error details:', error instanceof Error ? error.stack : String(error))
  process.exit(1)
})
