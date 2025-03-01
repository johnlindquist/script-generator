/**
 * Simple test script for manual reasoning extraction
 *
 * This script demonstrates how to manually extract reasoning from AI responses
 * without relying on the Vercel AI SDK middleware.
 *
 * Usage:
 * pnpm node scripts/test-reasoning-manual.ts
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

async function testManualExtraction() {
  console.log('🚀 Testing manual reasoning extraction...')

  try {
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
    const startTime = Date.now()

    // Extract reasoning manually
    const { text, reasoning, hasReasoning } = extractReasoningManually(sampleResponse)

    const endTime = Date.now()
    console.log('⏱️ Time taken:', (endTime - startTime) / 1000, 'seconds')

    // Display the results
    console.log('\n📄 EXTRACTED TEXT:')
    console.log('===========================================')
    console.log(text || 'No text extracted')
    console.log('===========================================')
    console.log(`📏 Text length: ${text?.length || 0} characters`)

    console.log('\n🧠 EXTRACTED REASONING:')
    console.log('===========================================')
    console.log(reasoning || 'No reasoning extracted')
    console.log('===========================================')
    console.log(`📏 Reasoning length: ${reasoning?.length || 0} characters`)
    console.log(`🔍 Has reasoning: ${hasReasoning}`)

    // Extract summary from reasoning
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

    // Test enhancing a prompt
    const originalPrompt = `
Explain how to implement a binary search algorithm in TypeScript.
`

    // Enhanced prompt with reasoning request
    const enhancedPrompt = enhancePromptWithReasoningRequest(originalPrompt)

    console.log('\n📤 Original prompt:')
    console.log(originalPrompt)

    console.log('\n📤 Enhanced prompt:')
    console.log(enhancedPrompt)

    console.log('\n🎉 All tests completed successfully!')

    return {
      text,
      reasoning,
      hasReasoning,
      summary,
      enhancedPrompt,
    }
  } catch (error) {
    console.error('❌ Test failed:', error)
    console.error('Error details:', error instanceof Error ? error.stack : String(error))
    process.exit(1)
  }
}

// Run the test
testManualExtraction().catch(error => {
  console.error('❌ Unhandled error:', error)
  console.error('Error details:', error instanceof Error ? error.stack : String(error))
  process.exit(1)
})
