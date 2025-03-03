/**
 * Configuration for the script generation service
 */
export const scriptGenerationConfig = {
  /**
   * The provider to use for draft generation
   * - 'default': Use the default provider (Gemini)
   * - 'openrouter': Use the OpenRouter provider
   */
  draftProvider: 'openrouter' as 'default' | 'openrouter',

  /**
   * Whether to extract reasoning from the OpenRouter provider
   * Only applies when draftProvider is 'openrouter'
   */
  extractReasoning: false,
}
