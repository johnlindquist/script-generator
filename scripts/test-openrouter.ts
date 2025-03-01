/**
 * Manual test script for OpenRouter integration
 *
 * This script makes a real API call to the OpenRouter endpoint
 * to verify that the integration is working correctly.
 *
 * Usage:
 * pnpm node scripts/test-openrouter.ts
 *
 * Note: This requires a running Next.js server and proper environment variables.
 * Start the server with: pnpm dev
 */

import 'dotenv/config'

// Direct test of OpenRouter API
async function testOpenRouterDirect() {
  console.log('🚀 Testing OpenRouter API directly...')

  const apiKey = process.env.OPENROUTER_API_KEY
  const model = process.env.OPENROUTER_DEFAULT_MODEL

  if (!apiKey) {
    console.error('❌ Missing OPENROUTER_API_KEY environment variable')
    process.exit(1)
  }

  if (!model) {
    console.error('❌ Missing OPENROUTER_DEFAULT_MODEL environment variable')
    process.exit(1)
  }

  try {
    console.log(`📝 Using model: ${model}`)
    console.log(`🔑 API Key (first 4 chars): ${apiKey.substring(0, 4)}...`)
    console.log('⏳ Sending request to OpenRouter...')

    // More detailed prompt to ensure we get a good response
    const prompt = `
Write a TypeScript script that does the following:
1. Creates a simple "Hello, World!" console application
2. Includes proper TypeScript types
3. Has a main function that is called when the script runs
4. Includes a comment header explaining what the script does

Please provide only the code without explanations.
`
    const startTime = Date.now()

    console.log('📤 Sending prompt:', prompt)

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
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenRouter API error: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ Response received!')

    const fullResponse = result.choices[0].message.content

    const endTime = Date.now()
    console.log('\n\n⏱️ Time taken:', (endTime - startTime) / 1000, 'seconds')
    console.log('🎉 Test completed successfully!')

    // Display the full generated script with clear formatting
    console.log('\n\n📄 GENERATED SCRIPT:')
    console.log('===========================================')
    console.log(fullResponse)
    console.log('===========================================')
    console.log(`📏 Script length: ${fullResponse.length} characters`)

    return fullResponse
  } catch (error) {
    console.error('❌ Test failed:', error)
    console.error('Error details:', error instanceof Error ? error.stack : String(error))
    process.exit(1)
  }
}

// Run the test
testOpenRouterDirect().catch(error => {
  console.error('❌ Unhandled error:', error)
  console.error('Error details:', error instanceof Error ? error.stack : String(error))
  process.exit(1)
})
