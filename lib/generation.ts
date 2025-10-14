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

const CODE_BLOCK_REGEX = /```[\s\S]*?```/g

function compressCodeContent(code: string): string {
  const normalized = code.replace(/\r/g, '')
  const lines = normalized.split('\n')
  const compacted: string[] = []
  let blankCount = 0

  for (const line of lines) {
    const trimmedLine = line.replace(/[ \t]+$/g, '')
    if (trimmedLine.trim() === '') {
      blankCount += 1
      if (blankCount > 1) {
        continue
      }
      compacted.push('')
    } else {
      blankCount = 0
      compacted.push(trimmedLine)
    }
  }

  while (compacted.length && compacted[0] === '') {
    compacted.shift()
  }

  while (compacted.length && compacted[compacted.length - 1] === '') {
    compacted.pop()
  }

  return compacted.join('\n')
}

function compressTextContent(content: string): string {
  if (!content) {
    return content
  }

  const blocks: { placeholder: string; value: string }[] = []
  let working = content.replace(/\r/g, '').replace(CODE_BLOCK_REGEX, block => {
    const index = blocks.length
    const placeholder = `__CODE_BLOCK_${index}__`
    const match = block.match(/^```([^\n]*)\n?([\s\S]*?)```$/)

    if (match) {
      const [, language = '', body = ''] = match
      const header = language ? '```' + language : '```'
      const compressedBody = compressCodeContent(body)
      const codeSection = compressedBody
        ? `${header}\n${compressedBody}\n\`\`\``
        : `${header}\n\`\`\``
      blocks.push({ placeholder, value: codeSection })
    } else {
      blocks.push({ placeholder, value: block })
    }

    return placeholder
  })

  const lines = working.split('\n').map(line => line.trim())

  const compacted: string[] = []
  let blankCount = 0

  for (const line of lines) {
    if (line === '') {
      blankCount += 1
      if (blankCount > 1) {
        continue
      }
      compacted.push('')
    } else {
      blankCount = 0
      compacted.push(line.replace(/\s{2,}/g, ' '))
    }
  }

  let compressed = compacted
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  for (const block of blocks) {
    compressed = compressed.replace(block.placeholder, block.value)
  }

  return compressed
}

export function getKitTypes() {
  const condensedPath = path.join(process.cwd(), 'prompts', 'kit-types.min.d.ts')

  try {
    if (fs.existsSync(condensedPath)) {
      return compressCodeContent(fs.readFileSync(condensedPath, 'utf-8'))
    }
    console.warn(`Condensed types missing at ${condensedPath}, falling back to raw definitions`)
  } catch (error) {
    console.error('Error reading condensed type definitions:', error)
  }

  const typesPath = path.join(process.cwd(), 'kit', 'types')
  try {
    if (!fs.existsSync(typesPath)) {
      console.warn(`Types directory not found at ${typesPath}`)
      return ''
    }

    return fs
      .readdirSync(typesPath)
      .filter(file => file.endsWith('.ts') || file.endsWith('.d.ts'))
      .sort()
      .map(file => {
        try {
          const raw = fs.readFileSync(path.join(typesPath, file), 'utf-8')
          const compressed = compressCodeContent(raw)
          return `// ${file}\n${compressed}`
        } catch (fileError) {
          console.error(`Error reading file ${file}:`, fileError)
          return ''
        }
      })
      .filter(Boolean)
      .join('\n\n')
  } catch (error) {
    console.error('Error reading type files:', error)
    return ''
  }
}

// Function to read example scripts
const CURATED_EXAMPLES = [
  'chatgpt.ts',
  'express-server.ts',
  'giphy-search.ts',
  'journal.ts',
  'main-menu-shortcuts.ts',
  'openai-playground.ts',
  'scrape-images.ts',
  'todos.ts',
]

export function getExampleScripts() {
  const examplesPath = path.join(process.cwd(), 'kit', 'examples')
  try {
    if (!fs.existsSync(examplesPath)) {
      console.warn(`Examples directory not found at ${examplesPath}`)
      return ''
    }

    const available = fs
      .readdirSync(examplesPath)
      .filter(file => file.endsWith('.ts') && !file.startsWith('.'))

    const chosen = CURATED_EXAMPLES.filter(file => available.includes(file))
    const fallback = chosen.length > 0 ? chosen : available.slice(0, 6)

    return fallback
      .sort()
      .map(file => {
        try {
          const raw = fs.readFileSync(path.join(examplesPath, file), 'utf-8')
          const compressed = compressCodeContent(raw)
          return `// ${file}\n${compressed}`
        } catch (fileError) {
          console.error(`Error reading example ${file}:`, fileError)
          return ''
        }
      })
      .filter(Boolean)
      .join('\n\n')
  } catch (error) {
    console.error('Error reading example scripts:', error)
    return ''
  }
}

export function getMetadataContent() {
  const metadataPath = path.join(process.cwd(), 'prompts', 'METADATA.md')
  return compressTextContent(fs.readFileSync(metadataPath, 'utf-8'))
}

export function getSystemContent() {
  const systemPath = path.join(process.cwd(), 'prompts', 'SYSTEM.md')
  return compressTextContent(fs.readFileSync(systemPath, 'utf-8'))
}

export function getGuideContent() {
  const condensedPath = path.join(process.cwd(), 'prompts', 'GUIDE-PLAYBOOK.md')
  const sourcePath = fs.existsSync(condensedPath)
    ? condensedPath
    : path.join(process.cwd(), 'prompts', 'GUIDE.md')
  return compressTextContent(fs.readFileSync(sourcePath, 'utf-8'))
}

export function getAPIDocsContent() {
  const apiPathCondensed = path.join(process.cwd(), 'prompts', 'API-REFERENCE.md')
  const apiPathLegacy = path.join(process.cwd(), 'prompts', 'API-GENERATED.md')
  const sourcePath = fs.existsSync(apiPathCondensed) ? apiPathCondensed : apiPathLegacy
  return compressTextContent(fs.readFileSync(sourcePath, 'utf-8'))
}

export function getDocsMini() {
  const condensedPath = path.join(process.cwd(), 'prompts', 'docs-mini-condensed.md')
  const sourcePath = fs.existsSync(condensedPath)
    ? condensedPath
    : path.join(process.cwd(), 'prompts', 'docs-mini.md')
  return compressTextContent(fs.readFileSync(sourcePath, 'utf-8'))
}

// Function to read docs-mini.md
export function getPromptContent() {
  const promptPath = path.join(process.cwd(), 'prompts', 'prompt.md')
  return compressTextContent(fs.readFileSync(promptPath, 'utf-8'))
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
  // cleaned = cleaned.replace(/^(\/\/ Name:.*?)$/m, '$1\n')
  // cleaned = cleaned.replace(/^(\/\/ Description:.*?)$/m, '$1\n')
  // cleaned = cleaned.replace(/^(\/\/ Author:.*?)$/m, '$1\n')

  // // Also ensure no double newlines between metadata
  // cleaned = cleaned.replace(/^(\/\/ Name:.*?\n\n)(\/\/ Description:)/gm, '$1$2')
  // cleaned = cleaned.replace(/^(\/\/ Description:.*?\n\n)(\/\/ Author:)/gm, '$1$2')

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
