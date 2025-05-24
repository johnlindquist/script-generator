/**
 * Configuration for the script generation service
 */
export const scriptGenerationConfig = {
  /**
   * The provider to use for draft generation
   * - 'default': Use the default provider (Gemini)
   * - 'openrouter': Use the OpenRouter provider
   * - 'ai-gateway': Use the Vercel AI Gateway provider
   */
  draftProvider: 'ai-gateway' as 'default' | 'openrouter' | 'ai-gateway',

  /**
   * Whether to extract reasoning from the AI provider
   * Only applies when draftProvider is 'openrouter' or 'ai-gateway'
   */
  extractReasoning: false,
}
