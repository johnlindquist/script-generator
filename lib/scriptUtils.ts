/**
 * Creates a prompt for enhancing/revising a script with AI
 *
 * @param originalPrompt - The original prompt that generated the script
 * @param scriptToRevise - The script content to be revised
 * @returns A formatted prompt string for AI enhancement
 */
export function createEnhancePrompt(originalPrompt: string, scriptToRevise: string): string {
  return `Revise this script with the following instructions:

Original prompt that generated this script:
<ORIGINAL_PROMPT>
${originalPrompt}
</ORIGINAL_PROMPT>

The script to revise:
<SCRIPT>
${scriptToRevise}
</SCRIPT>

<INSTRUCTIONS>
1. Make the code more efficient and performant
2. Improve readability and maintainability
3. Add better error handling where needed
4. Ensure type safety and remove any potential type issues
5. Keep the core functionality exactly the same
6. Add helpful comments for complex logic
</INSTRUCTIONS>


Enter any additional revisions you would like, or leave blank if none and hit enter:

`
}
