/**
 * Test script for OpenRouter Cached API route
 *
 * This script tests the cached API route by making multiple requests
 * to the local Next.js server and measuring the response times.
 *
 * Usage:
 * pnpm node scripts/test-openrouter-cached-api.ts
 *
 * Note: This requires a running Next.js server and proper environment variables.
 * Start the server with: pnpm dev
 */

import 'dotenv/config'

async function testOpenRouterCachedApi() {
  console.log('🚀 Testing OpenRouter Cached API route...')

  try {
    // Make multiple requests to test caching
    const numRequests = 3
    const results = []

    for (let i = 0; i < numRequests; i++) {
      console.log(`\n📤 Request ${i + 1}/${numRequests}...`)

      // Simple prompt that will be different for each request
      // to ensure we're testing the caching of the static context
      const prompt = `Create a script that ${['lists files', 'shows system info', 'displays current time'][i % 3]}`

      console.log(`📝 Prompt: "${prompt}"`)

      const startTime = Date.now()

      // Make a request to the local API route
      const response = await fetch('http://localhost:3000/api/generate-openrouter-cached', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Interaction-Timestamp': new Date().toISOString(),
        },
        body: JSON.stringify({
          prompt,
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
      const timeTaken = (endTime - startTime) / 1000

      console.log(`\n⏱️ Time taken: ${timeTaken} seconds`)

      // Store the result
      results.push({
        requestNumber: i + 1,
        prompt,
        timeTaken,
        responseLength: fullResponse.length,
        scriptId,
      })

      // Display a snippet of the response
      const snippet = fullResponse.slice(0, 200) + (fullResponse.length > 200 ? '...' : '')
      console.log('\n📄 Response snippet:')
      console.log('===========================================')
      console.log(snippet)
      console.log('===========================================')

      // Wait a bit between requests
      if (i < numRequests - 1) {
        console.log('⏳ Waiting 2 seconds before next request...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    // Display summary of results
    console.log('\n📊 RESULTS SUMMARY:')
    console.log('===========================================')

    for (const result of results) {
      console.log(
        `Request ${result.requestNumber}: ${result.timeTaken.toFixed(2)}s (${result.responseLength} chars)`
      )
    }

    console.log('===========================================')

    // Calculate average time
    const avgTime = results.reduce((sum, r) => sum + r.timeTaken, 0) / results.length
    console.log(`Average response time: ${avgTime.toFixed(2)} seconds`)

    // Check if caching is working by comparing times
    if (results.length > 1) {
      const firstTime = results[0].timeTaken
      const laterTimes = results.slice(1).map(r => r.timeTaken)
      const avgLaterTime = laterTimes.reduce((sum, t) => sum + t, 0) / laterTimes.length

      console.log(`First request: ${firstTime.toFixed(2)}s`)
      console.log(`Average of later requests: ${avgLaterTime.toFixed(2)}s`)

      if (avgLaterTime < firstTime) {
        console.log('✅ Caching appears to be working! Later requests are faster.')
      } else {
        console.log('⚠️ Caching might not be working as expected. Later requests are not faster.')
      }
    }

    console.log('\n🎉 Test completed successfully!')
  } catch (error) {
    console.error('❌ Test failed:', error)
    console.error('Error details:', error instanceof Error ? error.stack : String(error))
    process.exit(1)
  }
}

// Run the test
testOpenRouterCachedApi().catch(error => {
  console.error('❌ Unhandled error:', error)
  console.error('Error details:', error instanceof Error ? error.stack : String(error))
  process.exit(1)
})
