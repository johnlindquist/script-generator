/**
 * Simple test for minimal AI Gateway route
 */

import 'dotenv/config'

async function testMinimalGateway() {
  console.log('🧪 Testing minimal AI Gateway...')

  try {
    const response = await fetch('http://localhost:3000/api/test-ai-gateway', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'Say hello and tell me the current time',
      }),
    })

    console.log('📡 Response status:', response.status)
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Error response:', errorText)
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      console.error('❌ No reader available')
      return
    }

    console.log('📥 Reading stream...')
    let fullResponse = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = new TextDecoder().decode(value)
      process.stdout.write(chunk)
      fullResponse += chunk
    }

    console.log('\n\n✅ Minimal gateway test completed!')
    console.log('📝 Total response length:', fullResponse.length)
  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : String(error))
  }
}

testMinimalGateway()
