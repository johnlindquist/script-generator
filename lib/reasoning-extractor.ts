/**
 * Utility functions for extracting reasoning from AI responses
 *
 * These functions help extract reasoning details from AI responses,
 * either using the Vercel AI SDK middleware or manual extraction.
 */

import { wrapLanguageModel, extractReasoningMiddleware } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'

/**
 * Interface for the result of reasoning extraction
 */
export interface ReasoningResult {
  /** The final response text with reasoning removed */
  text: string
  /** The extracted reasoning text */
  reasoning: string
  /** Whether reasoning was successfully extracted */
  hasReasoning: boolean
}

/**
 * Creates an OpenRouter model with reasoning extraction middleware
 *
 * @param apiKey - The OpenRouter API key
 * @param modelName - The model name to use (e.g., 'anthropic/claude-3-5-sonnet')
 * @param tagName - The XML tag name to use for reasoning (default: 'reasoning')
 * @returns A wrapped model that can extract reasoning
 */
export function createOpenRouterWithReasoning(
  apiKey: string,
  modelName: string,
  tagName: string = 'reasoning'
) {
  // Create OpenRouter instance
  const openrouter = createOpenRouter({
    apiKey,
  })

  // Create a wrapped model with reasoning extraction middleware
  return wrapLanguageModel({
    model: openrouter(modelName),
    middleware: extractReasoningMiddleware({ tagName }),
  })
}

/**
 * Manually extracts reasoning from a response string
 *
 * @param response - The full response text
 * @param tagName - The XML tag name used for reasoning (default: 'reasoning')
 * @returns An object containing the extracted reasoning and the text without reasoning
 */
export function extractReasoningManually(
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
export function enhancePromptWithReasoningRequest(
  prompt: string,
  tagName: string = 'reasoning'
): string {
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
export function extractSummaryFromReasoning(reasoning: string, maxLines: number = 3): string {
  if (!reasoning) return ''

  // Extract a summary from the reasoning by taking the last few lines
  const summaryLines = reasoning
    .split('\n')
    .filter(line => line.trim().length > 0)
    .slice(-maxLines)

  return summaryLines.join('\n')
}
