// Mock script templates for testing streaming functionality
export interface MockScript {
  id: string
  name: string
  description: string
  content: string
  chunkSize?: number // How many characters to send per chunk
  delayMs?: number // Delay between chunks
}

export const mockScripts: Record<string, MockScript> = {
  short: {
    id: 'mock-short',
    name: 'Hello World Script',
    description: 'A simple hello world script',
    content: `import "@johnlindquist/kit"

// Simple hello world script
await say("Hello from Script Kit!")
await notify("Your first script is running!")`,
    chunkSize: 20,
    delayMs: 50,
  },

  long: {
    id: 'mock-long',
    name: 'Complex File Organizer',
    description: 'A comprehensive file organization script',
    content: `import "@johnlindquist/kit"

// File Organizer Script
// This script helps organize your downloads folder by file type

const downloadsPath = home("Downloads")
const files = await readdir(downloadsPath)

// Define organization rules
const organizationRules = {
  "Images": [".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp"],
  "Videos": [".mp4", ".avi", ".mov", ".mkv", ".webm"],
  "Documents": [".pdf", ".doc", ".docx", ".txt", ".odt"],
  "Archives": [".zip", ".rar", ".7z", ".tar", ".gz"],
  "Code": [".js", ".ts", ".py", ".java", ".cpp", ".html", ".css"],
  "Audio": [".mp3", ".wav", ".flac", ".aac", ".ogg"]
}

// Create folders if they don't exist
for (const folderName of Object.keys(organizationRules)) {
  const folderPath = path.join(downloadsPath, folderName)
  if (!await pathExists(folderPath)) {
    await ensureDir(folderPath)
    log(\`Created folder: \${folderName}\`)
  }
}

// Track moved files
const movedFiles = []

// Organize files
for (const file of files) {
  const filePath = path.join(downloadsPath, file)
  const stats = await stat(filePath)
  
  // Skip directories
  if (stats.isDirectory()) continue
  
  // Find matching category
  const ext = path.extname(file).toLowerCase()
  let moved = false
  
  for (const [category, extensions] of Object.entries(organizationRules)) {
    if (extensions.includes(ext)) {
      const targetPath = path.join(downloadsPath, category, file)
      
      // Check if file already exists in target
      if (await pathExists(targetPath)) {
        const timestamp = Date.now()
        const newName = \`\${path.basename(file, ext)}_\${timestamp}\${ext}\`
        const newTargetPath = path.join(downloadsPath, category, newName)
        await move(filePath, newTargetPath)
        movedFiles.push({ file: newName, category })
      } else {
        await move(filePath, targetPath)
        movedFiles.push({ file, category })
      }
      
      moved = true
      break
    }
  }
  
  if (!moved) {
    log(\`No category for: \${file}\`)
  }
}

// Show summary
if (movedFiles.length > 0) {
  const summary = movedFiles.reduce((acc, { category }) => {
    acc[category] = (acc[category] || 0) + 1
    return acc
  }, {})
  
  const message = Object.entries(summary)
    .map(([cat, count]) => \`\${cat}: \${count} files\`)
    .join("\\n")
  
  await notify({
    title: "Files Organized!",
    message: \`Moved \${movedFiles.length} files:\\n\${message}\`
  })
} else {
  await notify("No files to organize")
}`,
    chunkSize: 50,
    delayMs: 30,
  },

  error_midstream: {
    id: 'mock-error',
    name: 'Error Test Script',
    description: 'Script that errors halfway through',
    content: `import "@johnlindquist/kit"

// This script will demonstrate error handling
const apiKey = await env("OPENAI_API_KEY")
__ERROR_INJECTION_POINT__
// More code that won't be reached...
await say("This won't execute")`,
    chunkSize: 30,
    delayMs: 100,
  },

  slow_stream: {
    id: 'mock-slow',
    name: 'Slow Streaming Test',
    description: 'Tests slow network conditions',
    content: `import "@johnlindquist/kit"

// Simulating a very detailed script with slow generation
// This helps test UI loading states and user patience

const result = await arg("What would you like to do?", [
  "Option 1: Process files",
  "Option 2: Fetch data", 
  "Option 3: Send notifications"
])

// Add artificial complexity for testing
log("Starting process...")
log("Initializing...")
log("Loading dependencies...")
log("Preparing environment...")
log("Ready!")

await say(\`You selected: \${result}\`)`,
    chunkSize: 5, // Very small chunks
    delayMs: 200, // Slow delay
  },

  instant: {
    id: 'mock-instant',
    name: 'Instant Script',
    description: 'No streaming delay',
    content: `import "@johnlindquist/kit"\nawait say("Instant!")`,
    chunkSize: 1000,
    delayMs: 0,
  },

  unicode_stress: {
    id: 'mock-unicode',
    name: 'Unicode Stress Test',
    description: 'Tests special characters in streaming',
    content: `import "@johnlindquist/kit"

// Unicode stress test 🎉
const emojis = ["😀", "🎈", "🌟", "🔥", "💻", "🚀"]
const specialChars = ["café", "naïve", "Zürich", "北京", "🇺🇸🇬🇧"]

await say("Testing unicode: " + emojis.join(" "))

// Special characters in strings
const message = \`
  Café: ☕
  Weather: 🌤️
  Code: <script>alert('test')</script>
  Math: ∑(n=1 to ∞) 1/n²
\`

await div(md(message))`,
    chunkSize: 25,
    delayMs: 75,
  },
}

// Error injection types
export const errorTypes = {
  network_timeout: {
    message: 'Network timeout',
    code: 'ETIMEDOUT',
    status: 408,
  },
  rate_limit: {
    message: 'Rate limit exceeded. Please try again later.',
    code: 'RATE_LIMIT',
    status: 429,
  },
  auth_failed: {
    message: 'Authentication failed',
    code: 'UNAUTHORIZED',
    status: 401,
  },
  server_error: {
    message: 'Internal server error',
    code: 'INTERNAL_ERROR',
    status: 500,
  },
  invalid_prompt: {
    message: 'Invalid prompt: prompt must be at least 15 characters',
    code: 'VALIDATION_ERROR',
    status: 400,
  },
}
