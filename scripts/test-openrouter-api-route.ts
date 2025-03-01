/**
 * Test script for OpenRouter API route with reasoning extraction
 *
 * This script tests the API route with reasoning extraction by making a request
 * to the local Next.js server.
 *
 * Usage:
 * pnpm node scripts/test-openrouter-api-route.ts
 *
 * Note: This requires a running Next.js server and proper environment variables.
 * Start the server with: pnpm dev
 */

import 'dotenv/config'

async function testOpenRouterApiRoute() {
  console.log('🚀 Testing OpenRouter API route with reasoning extraction...')

  try {
    // Prompt that explicitly asks for reasoning in XML tags
    const prompt = `
Please create a TypeScript script that implements a simple calculator.
Use <reasoning>...</reasoning> tags to show your step-by-step thought process.

The calculator should:
1. Support basic operations (add, subtract, multiply, divide)
2. Have proper error handling
3. Include TypeScript types
4. Be well-commented
`

    console.log('📤 Sending prompt to API route...')
    console.log(prompt)

    const startTime = Date.now()

    // Make a request to the local API route
    const response = await fetch('http://localhost:3000/api/generate-openrouter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Interaction-Timestamp': new Date().toISOString(),
      },
      body: JSON.stringify({
        prompt,
        extractReasoning: true, // Signal that we want to extract reasoning
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API route error: ${response.status} ${errorText}`)
    }

    // Process the streaming response
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Response body is null')
    }

    let scriptId = ''
    let fullResponse = ''
    let done = false

    console.log('📥 Receiving streaming response...')

    // Read the stream
    while (!done) {
      const { value, done: doneReading } = await reader.read()
      done = doneReading

      if (value) {
        const chunk = new TextDecoder().decode(value)

        // Check for script ID at the beginning of the stream
        if (chunk.includes('__SCRIPT_ID__') && !scriptId) {
          const match = chunk.match(/__SCRIPT_ID__(.+?)__SCRIPT_ID__/)
          if (match && match[1]) {
            scriptId = match[1]
            console.log(`📝 Script ID: ${scriptId}`)
            // Remove the script ID from the chunk
            const cleanedChunk = chunk.replace(/__SCRIPT_ID__(.+?)__SCRIPT_ID__/, '')
            fullResponse += cleanedChunk
          } else {
            fullResponse += chunk
          }
        } else {
          fullResponse += chunk
        }

        // Print progress
        process.stdout.write('.')
      }
    }

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
    console.log(`📏 Reasoning length: ${extractedReasoning?.length || 0} characters`)

    // Extract the final answer (everything outside the reasoning tags)
    const finalAnswer = fullResponse.replace(reasoningRegex, '').trim()

    console.log('\n\n📝 FINAL ANSWER (without reasoning):')
    console.log('===========================================')
    console.log(finalAnswer)
    console.log('===========================================')
    console.log(`📏 Final answer length: ${finalAnswer.length} characters`)

    return { fullResponse, reasoning: extractedReasoning, finalAnswer, scriptId }
  } catch (error) {
    console.error('❌ Test failed:', error)
    console.error('Error details:', error instanceof Error ? error.stack : String(error))
    process.exit(1)
  }
}

// Run the test
testOpenRouterApiRoute().catch(error => {
  console.error('❌ Unhandled error:', error)
  console.error('Error details:', error instanceof Error ? error.stack : String(error))
  process.exit(1)
})
