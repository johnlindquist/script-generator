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
  const apiPath = path.join(process.cwd(), 'prompts', 'API.md')
  const docsPath = path.join(process.cwd(), 'prompts', 'docs-mini.md')
  const promptPath = path.join(process.cwd(), 'prompts', 'prompt.md')
  try {
    if (!fs.existsSync(docsPath)) {
      console.warn(`Docs file not found at ${docsPath}`)
      return ''
    }

    const apiContent = fs.readFileSync(apiPath, 'utf-8')
    const docsContent = fs.readFileSync(docsPath, 'utf-8')

    let content = `${apiContent}\n\n${docsContent}`

    // Append prompt.md content if it exists
    if (fs.existsSync(promptPath)) {
      const promptContent = fs.readFileSync(promptPath, 'utf-8')
      content += `\n\n${promptContent}`
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
  cleaned = cleaned.replace(/^\s*\n/, '')

  // Ensure proper line breaks around metadata comments
  cleaned = cleaned.replace(/^(\/\/ Name:.*?)(\n?)(\n?)(\/\/ Description:)/gm, '$1\n$4')
  cleaned = cleaned.replace(/^(\/\/ Description:.*?)(\n?)(\n?)(\/\/ Author:)/gm, '$1\n$4')

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

  // If we didn't find a name in comments, try to extract from metadata block
  if (!metadata.name) {
    // Try to match the metadata object format: metadata = { name: "Script Name" }
    const metadataRegex = /metadata\s*=\s*\{\s*name\s*:\s*["']([^"']+)["']/i
    const metadataMatch = content.match(metadataRegex)
    if (metadataMatch) {
      metadata.name = metadataMatch[1].trim()
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
