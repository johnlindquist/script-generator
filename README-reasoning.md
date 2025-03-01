# Reasoning Extraction for OpenRouter API

This document explains how to extract reasoning details from OpenRouter API responses using the Vercel AI SDK middleware or manual extraction.

## Overview

Reasoning extraction allows you to:

1. Request that the AI model show its step-by-step reasoning process
2. Extract this reasoning from the response
3. Separate the reasoning from the final answer
4. Use the reasoning for debugging, transparency, or educational purposes

## Methods for Reasoning Extraction

There are two main methods for extracting reasoning:

1. **Using Vercel AI SDK Middleware** - This approach uses the `extractReasoningMiddleware` from the Vercel AI SDK to automatically extract reasoning from the model's response.
2. **Manual Extraction** - This approach uses regex to extract reasoning from the model's response after receiving it.

## Using the Reasoning Extractor Utilities

We've created utility functions in `lib/reasoning-extractor.ts` to make it easy to extract reasoning:

```typescript
import {
  createOpenRouterWithReasoning,
  enhancePromptWithReasoningRequest,
  extractReasoningManually,
  extractSummaryFromReasoning,
} from '@/lib/reasoning-extractor'
```

### 1. Creating a Model with Reasoning Extraction

```typescript
// Create a model with reasoning extraction
const modelWithReasoning = createOpenRouterWithReasoning(apiKey, modelName)

// Generate text with reasoning extraction
const { text, reasoning } = await generateText({
  model: modelWithReasoning,
  prompt: enhancedPrompt,
})
```

### 2. Enhancing a Prompt with Reasoning Request

```typescript
// Original prompt
const originalPrompt = `
Explain how to implement a binary search algorithm in TypeScript.
`

// Enhanced prompt with reasoning request
const enhancedPrompt = enhancePromptWithReasoningRequest(originalPrompt)
```

### 3. Manual Extraction from a Response

```typescript
// Extract reasoning manually
const { text, reasoning, hasReasoning } = extractReasoningManually(fullResponse)

// Display the results
console.log('Final answer:', text)
console.log('Reasoning:', reasoning)
console.log('Has reasoning:', hasReasoning)
```

### 4. Extracting a Summary from Reasoning

```typescript
// Extract summary from reasoning
const summary = extractSummaryFromReasoning(reasoning, 3)

// Display the summary
console.log('Summary:', summary)
```

## API Route Integration

The API route in `app/api/generate-openrouter/route.ts` has been updated to support reasoning extraction:

```typescript
// If reasoning extraction is requested, enhance the prompt
if (extractReasoning) {
  draftPrompt = enhancePromptWithReasoningRequest(draftPrompt)
}

// Initialize the model based on whether reasoning extraction is requested
let result
if (extractReasoning && OPENROUTER_API_KEY) {
  // Use the utility function to create a model with reasoning extraction
  const modelWithReasoning = createOpenRouterWithReasoning(OPENROUTER_API_KEY, DEFAULT_MODEL)

  result = await streamText({
    model: modelWithReasoning,
    prompt: draftPrompt,
  })
} else {
  // Create standard OpenRouter instance without reasoning extraction
  const openrouter = createOpenRouter({
    apiKey: OPENROUTER_API_KEY || '',
  })

  result = await streamText({
    model: openrouter(DEFAULT_MODEL),
    prompt: draftPrompt,
  })
}
```

## Test Scripts

We've created several test scripts to demonstrate how to use the reasoning extraction functionality:

1. **`scripts/test-reasoning-manual.ts`** - Tests the manual extraction of reasoning from a sample response.
2. **`scripts/test-openrouter-reasoning-direct-manual.ts`** - Tests the direct API call to OpenRouter with manual extraction of reasoning.
3. **`scripts/test-openrouter-reasoning.ts`** - Tests the Vercel AI SDK middleware approach to reasoning extraction.
4. **`scripts/test-openrouter-api-route.ts`** - Tests the API route with reasoning extraction.

## Usage Examples

### Example 1: Direct API Call with Manual Extraction

```typescript
// Original prompt
const originalPrompt = `
Analyze the following code snippet and explain what it does.

\`\`\`typescript
function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
\`\`\`
`

// Enhanced prompt with reasoning request
const enhancedPrompt = enhancePromptWithReasoningRequest(originalPrompt)

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
    messages: [{ role: 'user', content: enhancedPrompt }],
    temperature: 0.7,
    max_tokens: 1000,
  }),
})

const result = await response.json()
const fullResponse = result.choices[0].message.content

// Extract reasoning manually
const { text, reasoning, hasReasoning } = extractReasoningManually(fullResponse)

// Display the results
console.log('Final answer:', text)
console.log('Reasoning:', reasoning)
```

### Example 2: Using the API Route

```typescript
// Make a request to the API route
const response = await fetch('/api/generate-openrouter', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Interaction-Timestamp': new Date().toISOString(),
  },
  body: JSON.stringify({
    prompt: 'Create a TypeScript script that implements a simple calculator.',
    extractReasoning: true, // Signal that we want to extract reasoning
  }),
})

// Process the streaming response
// ... (see scripts/test-openrouter-api-route.ts for details)
```

## Best Practices

1. **Be Explicit** - Always explicitly ask the model to include its reasoning in XML tags.
2. **Use the Right Tag** - Make sure the tag name in the prompt matches the tag name used for extraction.
3. **Check for Reasoning** - Always check if reasoning was extracted before trying to use it.
4. **Handle Empty Responses** - Some models might put all their content in the reasoning tags, leaving the final response empty.
5. **Consider Performance** - Reasoning extraction adds some overhead, so use it only when needed.

## Limitations

1. **Model Support** - Not all models support reasoning extraction equally well.
2. **Tag Format** - The model might not always follow the exact tag format requested.
3. **Middleware Compatibility** - The Vercel AI SDK middleware might not be compatible with all OpenRouter models.

## Conclusion

Reasoning extraction is a powerful tool for understanding how AI models arrive at their answers. By using the utilities provided in this repository, you can easily extract reasoning from OpenRouter API responses and use it for debugging, transparency, or educational purposes.
