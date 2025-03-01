/**
 * Test script for reasoning extraction utilities
 *
 * This script demonstrates how to use the reasoning extraction utilities
 * to extract reasoning from AI responses.
 *
 * Usage:
 * pnpm node scripts/test-reasoning-utils.ts
 *
 * Note: This requires proper environment variables.
 * Make sure OPENROUTER_API_KEY and OPENROUTER_DEFAULT_MODEL are set.
 */

import 'dotenv/config'
import { generateText } from 'ai'
import path from 'path'
import { fileURLToPath } from 'url'

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Import the reasoning extractor utilities
const reasoningExtractorPath = path.join(__dirname, '..', 'lib', 'reasoning-extractor.js')
import {
  createOpenRouterWithReasoning,
  enhancePromptWithReasoningRequest,
  extractReasoningManually,
  extractSummaryFromReasoning,
} from '../lib/reasoning-extractor.js'

async function testReasoningUtils() {
  console.log('🚀 Testing reasoning extraction utilities...')

  const apiKey = process.env.OPENROUTER_API_KEY
  const modelName = process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3-5-sonnet'

  if (!apiKey) {
    console.error('❌ Missing OPENROUTER_API_KEY environment variable')
    process.exit(1)
  }

  try {
    console.log(`📝 Using model: ${modelName}`)
    console.log(`🔑 API Key (first 4 chars): ${apiKey.substring(0, 4)}...`)

    // Test 1: Using the middleware approach
    console.log('\n\n🧪 TEST 1: Using the middleware approach')

    // Create a model with reasoning extraction
    const modelWithReasoning = createOpenRouterWithReasoning(apiKey, modelName)

    // Original prompt
    const originalPrompt = `
Explain how to implement a binary search algorithm in TypeScript.
`

    // Enhanced prompt with reasoning request
    const enhancedPrompt = enhancePromptWithReasoningRequest(originalPrompt)

    console.log('📤 Original prompt:')
    console.log(originalPrompt)

    console.log('\n📤 Enhanced prompt:')
    console.log(enhancedPrompt)

    console.log('\n⏳ Generating response with middleware...')
    const startTime1 = Date.now()

    // Generate text with reasoning extraction
    const { text, reasoning } = await generateText({
      model: modelWithReasoning,
      prompt: enhancedPrompt,
    })

    const endTime1 = Date.now()
    console.log('⏱️ Time taken:', (endTime1 - startTime1) / 1000, 'seconds')

    // Display the results
    console.log('\n📄 FINAL RESPONSE:')
    console.log('===========================================')
    console.log(text || 'No final response text (all content was in reasoning)')
    console.log('===========================================')
    console.log(`📏 Response length: ${text?.length || 0} characters`)

    console.log('\n🧠 EXTRACTED REASONING:')
    console.log('===========================================')
    console.log(reasoning || 'No reasoning extracted')
    console.log('===========================================')
    console.log(`📏 Reasoning length: ${reasoning?.length || 0} characters`)

    // Test 2: Manual extraction from a response
    console.log('\n\n🧪 TEST 2: Manual extraction from a response')

    // Sample response with reasoning tags
    const sampleResponse = `
<reasoning>
First, I need to understand what a binary search algorithm does:
1. It's an efficient search algorithm for finding an element in a sorted array
2. It works by repeatedly dividing the search interval in half
3. It has O(log n) time complexity, which is very efficient

Now, for the implementation steps:
1. We need a sorted array as input
2. We'll track the left and right boundaries of our search space
3. We calculate the middle point and compare the target value
4. Based on the comparison, we adjust either the left or right boundary
5. We continue until we find the element or determine it doesn't exist
</reasoning>

# Binary Search Implementation in TypeScript

Here's how to implement a binary search algorithm in TypeScript:

\`\`\`typescript
function binarySearch<T>(sortedArray: T[], target: T): number {
  let left = 0;
  let right = sortedArray.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    
    if (sortedArray[mid] === target) {
      return mid; // Found the target at index mid
    } else if (sortedArray[mid] < target) {
      left = mid + 1; // Target is in the right half
    } else {
      right = mid - 1; // Target is in the left half
    }
  }
  
  return -1; // Target not found
}
\`\`\`

This implementation:
- Takes a sorted array and a target value
- Returns the index of the target if found, or -1 if not found
- Has O(log n) time complexity
- Works with any comparable type T
`

    console.log('📤 Sample response with reasoning tags:')
    console.log(sampleResponse.substring(0, 200) + '...')

    console.log('\n⏳ Extracting reasoning manually...')
    const startTime2 = Date.now()

    // Extract reasoning manually
    const {
      text: extractedText,
      reasoning: extractedReasoning,
      hasReasoning,
    } = extractReasoningManually(sampleResponse)

    const endTime2 = Date.now()
    console.log('⏱️ Time taken:', (endTime2 - startTime2) / 1000, 'seconds')

    // Display the results
    console.log('\n📄 EXTRACTED TEXT:')
    console.log('===========================================')
    console.log(extractedText || 'No text extracted')
    console.log('===========================================')
    console.log(`📏 Text length: ${extractedText?.length || 0} characters`)

    console.log('\n🧠 EXTRACTED REASONING:')
    console.log('===========================================')
    console.log(extractedReasoning || 'No reasoning extracted')
    console.log('===========================================')
    console.log(`📏 Reasoning length: ${extractedReasoning?.length || 0} characters`)
    console.log(`🔍 Has reasoning: ${hasReasoning}`)

    // Test 3: Extract summary from reasoning
    console.log('\n\n🧪 TEST 3: Extract summary from reasoning')

    console.log('⏳ Extracting summary from reasoning...')
    const startTime3 = Date.now()

    // Extract summary from reasoning
    const summary = extractSummaryFromReasoning(extractedReasoning, 3)

    const endTime3 = Date.now()
    console.log('⏱️ Time taken:', (endTime3 - startTime3) / 1000, 'seconds')

    // Display the results
    console.log('\n📝 SUMMARY FROM REASONING:')
    console.log('===========================================')
    console.log(summary || 'No summary extracted')
    console.log('===========================================')
    console.log(`📏 Summary length: ${summary?.length || 0} characters`)

    console.log('\n🎉 All tests completed successfully!')

    return {
      test1: { text, reasoning },
      test2: { text: extractedText, reasoning: extractedReasoning, hasReasoning },
      test3: { summary },
    }
  } catch (error) {
    console.error('❌ Test failed:', error)
    console.error('Error details:', error instanceof Error ? error.stack : String(error))
    process.exit(1)
  }
}

// Run the test
testReasoningUtils().catch(error => {
  console.error('❌ Unhandled error:', error)
  console.error('Error details:', error instanceof Error ? error.stack : String(error))
  process.exit(1)
})
