import fs from 'node:fs'
import path from 'node:path'
import { CLI_API_KEY } from '@/lib/env'
import dotenv from 'dotenv'

// Load environment variables
const result = dotenv.config()
console.log('Loaded environment variables:', {
  error: result.error?.message,
  parsed: result.parsed ? Object.keys(result.parsed) : null,
})

// We need absolute URLs when running from CLI
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

console.log('Environment check:', {
  BASE_URL,
  hasCLIKey: !!CLI_API_KEY,
  envKeys: Object.keys(process.env).filter(k => !k.startsWith('npm_')),
})

if (!CLI_API_KEY) {
  throw new Error('CLI_API_KEY environment variable is required')
}

async function generateLucky(timestamp: string) {
  const headers: HeadersInit = {
    'Interaction-Timestamp': timestamp,
    'X-CLI-API-Key': CLI_API_KEY as string,
  }

  console.log('Making API request:', {
    url: `${BASE_URL}/api/lucky`,
    timestamp,
    hasApiKey: !!CLI_API_KEY,
    headers,
  })

  const response = await fetch(`${BASE_URL}/api/lucky`, { headers })

  if (response.status === 401) {
    console.error('Auth failed:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      text: await response.text(),
    })
    throw new Error('Unauthorized - check your CLI_API_KEY')
  }

  if (!response.ok) {
    throw new Error(`Failed to generate lucky prompt: ${response.statusText}`)
  }

  return response.json()
}

async function generateDraftWithStream(
  prompt: string,
  timestamp: string,
  callbacks: {
    onStartStreaming?: () => void
    onScriptId?: (scriptId: string) => void
    onChunk?: (text: string) => void
    onError?: (error: Error) => void
  } = {}
) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Interaction-Timestamp': timestamp,
    'X-CLI-API-Key': CLI_API_KEY as string,
  }

  console.log('Making draft API request:', {
    url: `${BASE_URL}/api/generate-draft`,
    timestamp,
    hasApiKey: !!CLI_API_KEY,
    headers,
    promptLength: prompt.length,
  })

  const response = await fetch(`${BASE_URL}/api/generate-draft`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt }),
  })

  if (!response.ok) {
    console.error('Draft generation failed:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      text: await response.text(),
    })
    throw new Error(`Failed to generate draft: ${response.statusText}`)
  }

  if (!response.body) {
    throw new Error('No response body')
  }

  const reader = response.body.getReader()
  let scriptId: string | undefined
  let fullText = ''

  try {
    callbacks.onStartStreaming?.()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = new TextDecoder().decode(value)
      console.log('Received chunk:', {
        chunkSize: chunk.length,
        hasScriptId: chunk.includes('__SCRIPT_ID__'),
        bufferSize: buffer.length,
      })

      buffer += chunk

      // Handle script ID prefix
      if (!scriptId && buffer.includes('__SCRIPT_ID__')) {
        const match = buffer.match(/__SCRIPT_ID__(.+?)__SCRIPT_ID__/)
        if (match) {
          scriptId = match[1]
          if (scriptId) {
            callbacks.onScriptId?.(scriptId)
          }
          // Remove the script ID prefix from buffer
          buffer = buffer.replace(/__SCRIPT_ID__(.+?)__SCRIPT_ID__/, '')
        }
      }

      // Update the full text with cleaned buffer
      fullText = buffer
      callbacks.onChunk?.(fullText)
    }
  } catch (error) {
    callbacks.onError?.(error as Error)
    throw error
  }

  return fullText
}

async function main() {
  // Ensure the drafts/ directory exists
  const draftsDir = path.join(process.cwd(), 'drafts')
  if (!fs.existsSync(draftsDir)) {
    fs.mkdirSync(draftsDir, { recursive: true })
  }

  // Generate 10 drafts
  for (let i = 1; i <= 10; i++) {
    const interactionTimestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')

    console.log(`\nGenerating draft ${i}/10...`)

    // 1) Fetch a random "lucky" prompt
    const luckyData = await generateLucky(interactionTimestamp)
    const prompt = luckyData.combinedPrompt || 'No prompt found.'
    console.log(`Got prompt: ${prompt}`)

    // 2) Stream the draft output
    let draftText = ''
    await generateDraftWithStream(prompt, interactionTimestamp, {
      onStartStreaming: () => {
        console.log(`Starting draft generation...`)
      },
      onScriptId: scriptId => {
        console.log(`Generated script ID: ${scriptId}`)
      },
      onChunk: text => {
        draftText = text
      },
      onError: error => {
        console.error(`Error in draft generation:`, error)
      },
    })

    // 3) Write the result to local file
    const filePath = path.join(draftsDir, `draft-lucky-${i}.ts`)
    fs.writeFileSync(filePath, draftText, 'utf8')
    console.log(`Draft #${i} saved to: ${filePath}`)
  }

  console.log('\nAll 10 drafts created successfully! 🎉')
}

main().catch(error => {
  console.error('Error running generate-lucky-drafts:', error)
  process.exit(1)
})
