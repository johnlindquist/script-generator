/**
 * Test script for Vercel AI Gateway integration
 *
 * This script tests the new AI Gateway API route by making a request
 * to the local Next.js server using the Vercel AI Gateway.
 *
 * Usage:
 * pnpm node scripts/test-ai-gateway.ts
 *
 * Note: This requires a running Next.js server.
 * Start the server with: pnpm dev
 */

import 'dotenv/config'

async function testAIGatewayApiRoute() {
  console.log('🚀 Testing Vercel AI Gateway API route...')

  try {
    // Simple prompt to test the AI Gateway
    const prompt = `
Create a TypeScript script that shows the current time and date.

The script should:
1. Display the current date and time in a readable format
2. Show the timezone
3. Include proper TypeScript types
4. Be well-commented
`

    console.log('📤 Sending prompt to AI Gateway API route...')
    console.log(prompt)

    const startTime = Date.now()

    // Make a request to the local API route
    const response = await fetch('http://localhost:3000/api/generate-ai-gateway', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Interaction-Timestamp': new Date().toISOString(),
        'X-CLI-API-Key': process.env.CLI_API_KEY || '',
      },
      body: JSON.stringify({
        prompt,
        extractReasoning: false, // Not requesting reasoning for this test
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

    while (!done) {
      const { value, done: streamDone } = await reader.read()
      done = streamDone

      if (value) {
        const chunkText = new TextDecoder().decode(value)
        console.log('📦 Chunk received:', `${chunkText.slice(0, 50)}...`)

        // Extract script ID if present
        const scriptIdMatch = chunkText.match(/__SCRIPT_ID__(.+?)__SCRIPT_ID__/)
        if (scriptIdMatch) {
          scriptId = scriptIdMatch[1]
          console.log('🆔 Script ID extracted:', scriptId)
          // Remove script ID from the response
          fullResponse += chunkText.replace(/__SCRIPT_ID__.+?__SCRIPT_ID__/, '')
        } else {
          fullResponse += chunkText
        }
      }
    }

    const endTime = Date.now()
    const duration = endTime - startTime

    console.log('\n✅ AI Gateway test completed successfully!')
    console.log('🕒 Duration:', `${duration}ms`)
    console.log('🆔 Script ID:', scriptId)
    console.log('📝 Response length:', fullResponse.length, 'characters')
    console.log('\n📄 Generated script preview:')
    console.log('─'.repeat(50))
    console.log(fullResponse.slice(0, 300) + (fullResponse.length > 300 ? '\n...' : ''))
    console.log('─'.repeat(50))

    // Verify we got a valid response
    if (!scriptId) {
      console.warn('⚠️  Warning: No script ID was received')
    }

    if (fullResponse.length === 0) {
      console.warn('⚠️  Warning: No response content was received')
    } else {
      console.log('✅ Response content received successfully')
    }

    console.log('\n🎉 AI Gateway integration test passed!')
  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : String(error))

    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Make sure the Next.js development server is running:')
      console.log('   pnpm dev')
    }

    process.exit(1)
  }
}

// Run the test
testAIGatewayApiRoute().catch(error => {
  console.error('❌ Unhandled error:', error)
  process.exit(1)
})
