import fs from 'fs'
import path from 'path'

// Function to read example scripts
export function getExampleScripts() {
  const examplesPath = path.join(process.cwd(), 'examples')
  let allExampleContent = ''

  try {
    if (!fs.existsSync(examplesPath)) {
      console.warn(`Examples directory not found at ${examplesPath}`)
      return ''
    }

    const files = fs
      .readdirSync(examplesPath)
      .filter(file => file.endsWith('.ts') && !file.startsWith('.')) // Only .ts files, no hidden files
      .sort() // Ensure consistent ordering

    if (files.length === 0) {
      console.warn('No .ts files found in examples directory')
      return ''
    }

    console.log(`Found ${files.length} example scripts`)

    for (const file of files) {
      try {
        const filePath = path.join(examplesPath, file)
        const stats = fs.statSync(filePath)

        // Skip if not a file or too large (> 100KB)
        if (!stats.isFile() || stats.size > 100 * 1024) {
          console.warn(`Skipping ${file}: ${!stats.isFile() ? 'Not a file' : 'Too large'}`)
          continue
        }

        const content = fs.readFileSync(filePath, 'utf-8')
        allExampleContent += `\n---\nFile: ${file}\n${content}\n`
      } catch (fileError) {
        console.error(`Error reading file ${file}:`, fileError)
        // Continue with other files
      }
    }

    return allExampleContent
  } catch (error) {
    console.error('Error reading example scripts:', error)
    return '' // Return empty string on error, allowing generation to continue
  }
}

// Function to read docs-mini.md
export function getDocsContent() {
  const docsPath = path.join(process.cwd(), 'prompts', 'docs-mini.md')
  const promptPath = path.join(process.cwd(), 'prompts', 'prompt.md')
  try {
    if (!fs.existsSync(docsPath)) {
      console.warn(`Docs file not found at ${docsPath}`)
      return ''
    }

    let content = fs.readFileSync(docsPath, 'utf-8')

    // Append prompt.md content if it exists
    if (fs.existsSync(promptPath)) {
      const promptContent = fs.readFileSync(promptPath, 'utf-8')
      content += '\n\n' + promptContent
    }

    return content
  } catch (error) {
    console.error('Error reading docs content:', error)
    return '' // Return empty string on error, allowing generation to continue
  }
}

// Helper function to clean code fences and language specifiers
export function cleanCodeFences(text: string): string {
  // First, remove any standalone "typescript" or "ts" lines (case insensitive)
  let cleaned = text.replace(/^(typescript|ts)\s*$/gim, '')

  // Remove opening code fences with optional language specifier
  cleaned = cleaned.replace(/^```(?:typescript|ts)?\s*$/gm, '')

  // Remove closing code fences
  cleaned = cleaned.replace(/^```\s*$/gm, '')

  // Clean up any triple or more newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  return cleaned.trim()
}

// Initial pass prompt - minimal instructions for raw script generation
export const INITIAL_PASS_PROMPT = `You are a TypeScript script generator.
Create a workable script from the user's prompt with minimal checks.
Focus on core functionality without extensive error handling or formatting.

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

// Second pass prompt - extensive verification and refinement
export const SECOND_PASS_PROMPT = `You are a TypeScript script generator and code reviewer.
Your task is to verify, correct, refine, and format the provided script according to best practices.

Review and improve the following aspects:
1. Code style and formatting
2. Error handling and edge cases
3. Type safety and TypeScript features
4. Documentation and comments
5. Performance and efficiency
6. Security considerations
7. Following the examples and documentation exactly

<DOCS>
${getDocsContent()}
</DOCS>

<EXAMPLES>
${getExampleScripts()}
</EXAMPLES>

Here is the script to verify and improve:

<SCRIPT>
{script}
</SCRIPT>

Generate ONLY the improved script content, no additional explanations or markdown.
`
