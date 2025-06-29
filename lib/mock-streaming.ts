import { mockScripts, errorTypes } from './mock-scripts'

export interface MockStreamOptions {
  scriptId: string
  scenario: keyof typeof mockScripts
  error?: keyof typeof errorTypes
  errorAfterChunks?: number
  chunkSize?: number
  delayMs?: number
  onChunk?: (chunk: string, index: number) => void
  onError?: (error: Error) => void
}

export class MockStreamController {
  private abortController: AbortController
  private chunksStreamed = 0

  constructor() {
    this.abortController = new AbortController()
  }

  abort() {
    this.abortController.abort()
  }

  get signal() {
    return this.abortController.signal
  }

  incrementChunks() {
    this.chunksStreamed++
  }

  get chunkCount() {
    return this.chunksStreamed
  }
}

export function createMockStream(options: MockStreamOptions): ReadableStream<Uint8Array> {
  const mockScript = mockScripts[options.scenario]
  if (!mockScript) {
    throw new Error(`Unknown scenario: ${options.scenario}`)
  }

  const controller = new MockStreamController()
  const encoder = new TextEncoder()

  // Use provided options or defaults from mock script
  const chunkSize = options.chunkSize ?? mockScript.chunkSize ?? 30
  const delayMs = options.delayMs ?? mockScript.delayMs ?? 50

  return new ReadableStream({
    async start(streamController) {
      try {
        // Send script ID first (matching real API behavior)
        if (options.scriptId) {
          const idChunk = `__SCRIPT_ID__${options.scriptId}__SCRIPT_ID__`
          streamController.enqueue(encoder.encode(idChunk))
          controller.incrementChunks()
          options.onChunk?.(idChunk, 0)

          // Small delay after ID
          await new Promise(resolve => setTimeout(resolve, 50))
        }

        // Stream the content in chunks
        const content = mockScript.content
        let position = 0
        let chunkIndex = 1

        while (position < content.length) {
          // Check for abort
          if (controller.signal.aborted) {
            streamController.close()
            return
          }

          // Check for error injection
          if (
            options.error &&
            options.errorAfterChunks &&
            controller.chunkCount >= options.errorAfterChunks
          ) {
            const error = errorTypes[options.error]
            const errorObj = new Error(error.message)
            options.onError?.(errorObj)
            streamController.error(errorObj)
            return
          }

          // Special handling for error injection point
          if (
            content.includes('__ERROR_INJECTION_POINT__') &&
            position <= content.indexOf('__ERROR_INJECTION_POINT__') &&
            position + chunkSize > content.indexOf('__ERROR_INJECTION_POINT__')
          ) {
            // Inject error here
            if (options.error) {
              const error = errorTypes[options.error]
              const errorObj = new Error(error.message)
              options.onError?.(errorObj)
              streamController.error(errorObj)
              return
            }
            // Skip the injection point marker
            position =
              content.indexOf('__ERROR_INJECTION_POINT__') + '__ERROR_INJECTION_POINT__'.length
            continue
          }

          const chunk = content.slice(position, position + chunkSize)
          streamController.enqueue(encoder.encode(chunk))
          controller.incrementChunks()
          options.onChunk?.(chunk, chunkIndex)

          position += chunkSize
          chunkIndex++

          // Delay between chunks
          if (delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs))
          }
        }

        streamController.close()
      } catch (error) {
        options.onError?.(error as Error)
        streamController.error(error)
      }
    },

    cancel() {
      controller.abort()
    },
  })
}

export function createMockResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Mock-Response': 'true',
    },
  })
}

export function createMockErrorResponse(errorType: keyof typeof errorTypes): Response {
  const error = errorTypes[errorType]
  return new Response(
    JSON.stringify({
      error: error.message,
      code: error.code,
      mock: true,
    }),
    {
      status: error.status,
      headers: {
        'Content-Type': 'application/json',
        'X-Mock-Response': 'true',
      },
    }
  )
}

// Helper to create a mock fetch function for testing
export function createMockFetch(defaultOptions?: Partial<MockStreamOptions>) {
  return async (url: string, init?: RequestInit): Promise<Response> => {
    // Parse URL to get parameters
    const urlObj = new URL(url, 'http://localhost:3000')

    // Extract mock parameters from URL or body
    const body = init?.body ? JSON.parse(init.body as string) : {}
    const scenario =
      urlObj.searchParams.get('mock_scenario') ||
      body.mock_scenario ||
      defaultOptions?.scenario ||
      'short'

    const errorType =
      urlObj.searchParams.get('mock_error') || body.mock_error || defaultOptions?.error

    // Immediate errors (auth, rate limit)
    if (errorType && ['auth_failed', 'rate_limit', 'invalid_prompt'].includes(errorType)) {
      return createMockErrorResponse(errorType as keyof typeof errorTypes)
    }

    // Create streaming response
    const mockOptions: MockStreamOptions = {
      scriptId: body.scriptId || `mock-${Date.now()}`,
      scenario: scenario as keyof typeof mockScripts,
      error: errorType as keyof typeof errorTypes,
      errorAfterChunks: parseInt(urlObj.searchParams.get('error_after') || '5'),
      chunkSize: parseInt(urlObj.searchParams.get('chunk_size') || '') || undefined,
      delayMs: parseInt(urlObj.searchParams.get('delay_ms') || '') || undefined,
      ...defaultOptions,
    }

    const stream = createMockStream(mockOptions)
    return createMockResponse(stream)
  }
}

// Utility to test streaming without full API
export async function testMockStreaming(options: MockStreamOptions): Promise<{
  chunks: string[]
  fullContent: string
  error?: Error
  timing: number[]
}> {
  const chunks: string[] = []
  const timing: number[] = []
  let lastTime = Date.now()
  let error: Error | undefined

  const streamOptions: MockStreamOptions = {
    ...options,
    onChunk: chunk => {
      const now = Date.now()
      timing.push(now - lastTime)
      lastTime = now
      chunks.push(chunk)
    },
    onError: err => {
      error = err
    },
  }

  const stream = createMockStream(streamOptions)
  const reader = stream.getReader()
  const decoder = new TextDecoder()

  try {
    let done = false
    while (!done) {
      const { value, done: readerDone } = await reader.read()
      done = readerDone
      if (value) {
        // Decode for analysis but don't add to chunks (already done in onChunk)
        decoder.decode(value, { stream: true })
      }
    }
  } catch (err) {
    error = err as Error
  }

  return {
    chunks,
    fullContent: chunks.join(''),
    error,
    timing,
  }
}

// Generate a custom mock script on the fly
export function generateMockScriptContent(options: {
  length: 'short' | 'medium' | 'long'
  includeComments?: boolean
  includeImports?: boolean
  complexity?: 'simple' | 'moderate' | 'complex'
}): string {
  const lines: string[] = []

  // Imports
  if (options.includeImports !== false) {
    lines.push('import "@johnlindquist/kit"')
    if (options.complexity === 'complex') {
      lines.push('import { readFile, writeFile } from "fs/promises"')
      lines.push('import path from "path"')
    }
    lines.push('')
  }

  // Comments
  if (options.includeComments) {
    lines.push('// Generated mock script for testing')
    lines.push(`// Length: ${options.length}, Complexity: ${options.complexity || 'simple'}`)
    lines.push('')
  }

  // Content based on length and complexity
  if (options.complexity === 'simple' || !options.complexity) {
    lines.push('const name = await arg("What is your name?")')
    lines.push('await say(`Hello, ${name}!`)')
  } else if (options.complexity === 'moderate') {
    lines.push('const choices = ["Option A", "Option B", "Option C"]')
    lines.push('const selected = await arg("Choose an option:", choices)')
    lines.push('')
    lines.push('switch(selected) {')
    lines.push('  case "Option A":')
    lines.push('    await notify("You chose A!")')
    lines.push('    break')
    lines.push('  case "Option B":')
    lines.push('    await notify("You chose B!")')
    lines.push('    break')
    lines.push('  default:')
    lines.push('    await notify("You chose C!")')
    lines.push('}')
  } else {
    lines.push('// Complex example with file operations')
    lines.push('const files = await readdir(home())')
    lines.push('const textFiles = files.filter(f => f.endsWith(".txt"))')
    lines.push('')
    lines.push('if (textFiles.length > 0) {')
    lines.push('  const selected = await arg("Select a file:", textFiles)')
    lines.push('  const content = await readFile(path.join(home(), selected), "utf-8")')
    lines.push('  ')
    lines.push('  const lines = content.split("\\n")')
    lines.push('  await div(md(`')
    lines.push('# File: ${selected}')
    lines.push('## Stats')
    lines.push('- Lines: ${lines.length}')
    lines.push('- Characters: ${content.length}')
    lines.push('  `))')
    lines.push('} else {')
    lines.push('  await notify("No text files found in home directory")')
    lines.push('}')
  }

  // Add more content for longer scripts
  if (options.length === 'medium' || options.length === 'long') {
    lines.push('')
    lines.push('// Additional functionality')
    lines.push('const timestamp = new Date().toISOString()')
    lines.push('log(`Script executed at: ${timestamp}`)')

    if (options.length === 'long') {
      lines.push('')
      lines.push('// Even more functionality for long scripts')
      lines.push('const systemInfo = {')
      lines.push('  platform: process.platform,')
      lines.push('  arch: process.arch,')
      lines.push('  nodeVersion: process.version')
      lines.push('}')
      lines.push('')
      lines.push('await div(md(`')
      lines.push('### System Information')
      lines.push('- Platform: ${systemInfo.platform}')
      lines.push('- Architecture: ${systemInfo.arch}')
      lines.push('- Node Version: ${systemInfo.nodeVersion}')
      lines.push('`))')
    }
  }

  return lines.join('\n')
}
