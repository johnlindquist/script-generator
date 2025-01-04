import fs from 'fs'
import path from 'path'

// Interface for consistent user info across generation
export interface UserInfo {
  name: string | null
  username: string
  fullName: string | null
  image: string | null
}

interface SessionUser {
  id: string
  name?: string | null | undefined
  email?: string | null | undefined
  image?: string | null | undefined
}

interface DbUser {
  id: string
  username: string
}

// Helper to extract user info consistently
export function extractUserInfo(session: { user: SessionUser }, dbUser: DbUser | null): UserInfo {
  return {
    name: session.user.name || null,
    username:
      dbUser?.username ||
      session.user.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ||
      'unknown-user',
    fullName: session.user.name || null,
    image: session.user.image || null,
  }
}

export function getKitTypes() {
  const typesPath = path.join(process.cwd(), 'kit', 'types')
  let allTypesContent = ''

  try {
    if (!fs.existsSync(typesPath)) {
      console.warn(`Types directory not found at ${typesPath}`)
      return ''
    }

    const files = fs
      .readdirSync(typesPath)
      .filter(file => file.endsWith('.ts') || file.endsWith('.d.ts'))
      .sort() // Ensure consistent ordering

    if (files.length === 0) {
      console.warn('No TypeScript files found in types directory')
      return ''
    }

    console.log(`Found ${files.length} type definition files`)

    for (const file of files) {
      try {
        const filePath = path.join(typesPath, file)
        const stats = fs.statSync(filePath)

        // Skip if not a file or too large (> 100KB)
        if (!stats.isFile() || stats.size > 100 * 1024) {
          console.warn(`Skipping ${file}: ${!stats.isFile() ? 'Not a file' : 'Too large'}`)
          continue
        }

        const content = fs.readFileSync(filePath, 'utf-8')
        allTypesContent += `\n---\nFile: ${file}\n${content}\n`
      } catch (fileError) {
        console.error(`Error reading file ${file}:`, fileError)
        // Continue with other files
      }
    }

    return allTypesContent
  } catch (error) {
    console.error('Error reading type files:', error)
    return '' // Return empty string on error, allowing generation to continue
  }
}

// Function to read example scripts
export function getExampleScripts() {
  const examplesPath = path.join(process.cwd(), 'kit', 'examples')
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

// Simple code fence cleaner for script generation
export function cleanCodeFences(text: string): string {
  // First, remove any standalone "typescript" or "ts" lines (case insensitive)
  let cleaned = text.replace(/^(typescript|ts)\s*$/gim, '')

  // Remove opening code fences with optional language specifier
  cleaned = cleaned.replace(/^```(?:typescript|ts)?\s*$/gm, '')

  // Remove closing code fences
  cleaned = cleaned.replace(/^```\s*$/gm, '')

  // Clean up any triple or more newlines while preserving exactly two
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  // Remove leading newlines and whitespace before first non-empty line
  cleaned = cleaned.replace(/^\s*\n+/, '')

  // Return without trimming to preserve whitespace
  return cleaned
}

// Advanced code extractor for importing scripts from markdown
export function extractScriptFromMarkdown(text: string): string {
  if (text.trim().startsWith('//') || text.trim().startsWith('import ')) {
    return text.trim()
  }

  const codeBlockPatterns = [
    // Standard code blocks with language
    /```(?:typescript|ts|js|javascript)\r?\n([\s\S]*?)```/m,
    // Code blocks with no language
    /```\r?\n([\s\S]*?)```/m,
    // Code blocks with language but no newline
    /```(?:typescript|ts|js|javascript)([\s\S]*?)```/m,
    // Code blocks with no language or newline
    /```([\s\S]*?)```/m,
  ]

  // Try each pattern
  for (const pattern of codeBlockPatterns) {
    const match = text.match(pattern)
    if (match) {
      // Get the code from the first capture group
      const code = match[1]

      // If the extracted code looks like valid script content, use it
      if (
        code.includes('import "@johnlindquist/kit"') ||
        code.trim().startsWith('//') ||
        code.trim().startsWith('import ')
      ) {
        return code.trim()
      }
    }
  }

  // If we get here and the content has markdown-like content before a code block,
  // try to find the first code-like section
  const lines = text.split('\n')
  let codeStart = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.startsWith('//') || line.startsWith('import ')) {
      codeStart = i
      break
    }
  }

  if (codeStart !== -1) {
    return lines.slice(codeStart).join('\n').trim()
  }

  // If all else fails, return the cleaned input
  return text.trim()
}

// Helper function to extract metadata and code from markdown content
export function parseScriptFromMarkdown(content: string): {
  name?: string
  description?: string
  author?: string
  content: string
} {
  // Extract metadata from comments at the top
  const lines = content.split('\n')
  const metadata: Record<string, string> = {}
  let contentStartIndex = 0

  // Look for metadata in comments at the start
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.startsWith('//')) {
      const [key, ...valueParts] = line.slice(2).trim().split(':')
      const value = valueParts.join(':').trim()
      if (key && value) {
        metadata[key.toLowerCase()] = value
      }
      contentStartIndex = i + 1
    } else {
      break
    }
  }

  // If we found a 'Name' field, let's keep it short
  if (metadata.name) {
    // Truncate metadata.name if it's too long
    const maxNameLength = 30
    if (metadata.name.length > maxNameLength) {
      metadata.name = metadata.name.slice(0, maxNameLength)
    }
  }

  // Get the actual code content
  const codeContent = lines.slice(contentStartIndex).join('\n')

  return {
    name: metadata.name,
    description: metadata.description,
    author: metadata.author,
    content: codeContent.trim(),
  }
}

// Initial pass prompt - minimal instructions for raw script generation
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

// Second pass prompt - extensive verification and refinement
export const FINAL_PASS_PROMPT = `You are a TypeScript script generator and code reviewer.
Your task is to verify, correct, refine, and format the provided script according to best practices.
IMPORTANT: You MUST preserve the exact core functionality of the provided script. Do not change what the script does.

Review and improve the following aspects while keeping the same functionality:
1. Code style and formatting
2. Error handling and edge cases
3. Type safety and TypeScript features
4. Documentation and comments
5. Performance and efficiency
6. Security considerations

<USER_INFO>
{userInfo}
</USER_INFO>

Here is the script to verify and improve. You MUST keep its core functionality exactly the same:

<SCRIPT>
{script}
</SCRIPT>

Here are all the global types included with Script Kit:
<TYPES>
${getKitTypes()}
</TYPES>

<SUSPICIOUS_CODE>
import {foo} from "@johnlindquist/kit" is highly suspicious because we almost always use globals.
99.9% of the time, it will only be:
import "@johnlindquist/kit"
</SUSPICIOUS_CODE>

<GLOBALS>
You'll notice in <TYPES> that we're providing many of node.js APIs as global types. Please avoid using importing node.js APIs unless they're not specified in <TYPES>.!
</GLOBALS>

<LEGACY>
The "npm" function is deprecated. Please use standard esm/typescript imports.
</LEGACY>

Focus ONLY on improving the script above. Do not reference or combine with other scripts.
Re-generate the improved script content paying extra attention to the types.
If there's any overly complex logic, please add inline comments explaining it.

CRITICAL: The improved script MUST do exactly the same thing as the original script.
Do not change its core purpose or functionality. Only improve its implementation.

Be absolutely sure to include the following metadata in the script:

<METADATA>
// Name: A concise title for the script (max 20 chars)
// Description: A short description of the script (max 50 chars)
// Author: The name from the <USER_INFO>
</METADATA>

Generate ONLY the refined script content, no additional explanations or markdown.
`
