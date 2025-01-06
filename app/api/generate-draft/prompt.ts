import { getDocsContent, getExampleScripts } from '@/lib/generation'

export const DRAFT_PASS_PROMPT = `You are a TypeScript script generator.
Create a workable script from the user's prompt with minimal checks.
Focus on core functionality without extensive error handling or formatting.

<USER_INFO>
{userInfo}
</USER_INFO>

<DOCS>
${getDocsContent()}
</DOCS>

<EXAMPLES>
${getExampleScripts()}
</EXAMPLES>

Generate a script based on this prompt:

<USER_PROMPT>
{prompt}
</USER_PROMPT>

Generate ONLY the script content, no additional explanations or markdown.
`
