/**
 * Cached OpenRouter Client Demo
 *
 * This script demonstrates how to implement the two-step API call approach
 * with OpenRouter's caching capabilities for Anthropic Claude models.
 *
 * Usage:
 * pnpm node scripts/cached-openrouter-client.ts
 */

import 'dotenv/config'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'

// Cache lifetime in milliseconds (5 minutes)
const CACHE_LIFETIME = 5 * 60 * 1000

// Track when the cache was last refreshed
let lastCacheRefresh = 0
let cachedPromptId: string | null = null

async function main() {
  console.log('🚀 Testing OpenRouter Caching with Anthropic Claude...')

  const apiKey = process.env.OPENROUTER_API_KEY
  const model = process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3-5-sonnet'

  if (!apiKey) {
    console.error('❌ Missing OPENROUTER_API_KEY environment variable')
    process.exit(1)
  }

  // Create OpenRouter client
  const openrouter = createOpenRouter({
    apiKey,
  })

  // Large static context that would be cached
  const staticContext = `
You are a TypeScript script generator for Script Kit.
Your task is to create workable scripts based on user prompts.

Here are some guidelines:
1. Use ESM syntax. Always import, never "require"
2. Keep scripts minimal and focused on core functionality
3. Use proper TypeScript types
4. Include helpful comments
5. Follow best practices for error handling

Script Kit provides these global functions:
- arg(): Get user input with a prompt
- say(): Display a message to the user
- copy(): Copy text to clipboard
- paste(): Get text from clipboard
- cd(): Change directory
- home(): Get user's home directory
- trash(): Move a file to trash
- exec(): Execute a shell command
- notify(): Show a notification
- open(): Open a file or URL

Example script:
\`\`\`typescript
// Name: Hello World
// Description: A simple hello world script

import "@johnlindquist/kit"

const name = await arg("What's your name?")
await say(\`Hello, \${name}!\`)
\`\`\`

This is a large static context that would be expensive to process repeatedly.
`.repeat(10) // Making it larger to simulate a substantial context

  // User's dynamic prompt that changes with each request
  const userPrompt = 'Create a script that lists all files in the current directory, sorted by size'

  // Step 1: Cache the static context if needed
  if (Date.now() - lastCacheRefresh > CACHE_LIFETIME || !cachedPromptId) {
    console.log('⏳ Caching static context (first-time or cache expired)...')

    const cacheStartTime = Date.now()

    try {
      // Make the initial caching call
      const cacheResponse = await openrouter(model).chat.completions.create({
        messages: [
          {
            role: 'system',
            content: staticContext,
            cache_control: 'ephemeral', // Mark as cacheable
          },
        ],
        temperature: 0.7,
        max_tokens: 100, // Small response since we're just caching
      })

      // Store the timestamp of when we refreshed the cache
      lastCacheRefresh = Date.now()

      // In a real implementation, you might want to store some identifier
      // for the cached content, but OpenRouter handles this internally
      cachedPromptId = 'cached-' + Date.now()

      console.log(
        `✅ Static context cached successfully in ${(Date.now() - cacheStartTime) / 1000}s`
      )
      console.log(`📝 Cache ID: ${cachedPromptId}`)
      console.log(
        `⏱️ Cache will expire at: ${new Date(lastCacheRefresh + CACHE_LIFETIME).toLocaleTimeString()}`
      )
    } catch (error) {
      console.error('❌ Failed to cache static context:', error)
      process.exit(1)
    }
  } else {
    console.log(`ℹ️ Using existing cache from ${new Date(lastCacheRefresh).toLocaleTimeString()}`)
    console.log(`📝 Cache ID: ${cachedPromptId}`)
  }

  // Step 2: Make the actual request with both cached and dynamic content
  console.log('\n📤 Sending request with cached context + dynamic prompt...')
  console.log(`📝 User prompt: "${userPrompt}"`)

  const requestStartTime = Date.now()

  try {
    // Make the request with both the cached static context and dynamic user prompt
    const response = await openrouter(model).chat.completions.create({
      messages: [
        {
          role: 'system',
          content: staticContext, // Same exact content as cached before
          cache_control: 'ephemeral', // Mark as cacheable
        },
        {
          role: 'user',
          content: userPrompt, // Dynamic content that changes each time
          cache_control: 'no-cache', // Mark as not cacheable
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    const generatedScript = response.choices[0].message.content

    console.log(`✅ Response received in ${(Date.now() - requestStartTime) / 1000}s`)

    // Display the generated script
    console.log('\n📄 GENERATED SCRIPT:')
    console.log('===========================================')
    console.log(generatedScript)
    console.log('===========================================')
    console.log(`📏 Script length: ${generatedScript?.length || 0} characters`)

    // In a real implementation, you would save this script to a file or database
  } catch (error) {
    console.error('❌ Failed to generate script:', error)
    process.exit(1)
  }
}

// Run the main function
main().catch(error => {
  console.error('❌ Unhandled error:', error)
  process.exit(1)
})
