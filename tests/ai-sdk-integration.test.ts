import { describe, it, expect, beforeAll, afterAll, vi, afterEach } from 'vitest'
import { generateDraft } from '@/lib/openrouterService'
import { default as nodeFetch } from 'node-fetch'

// Mock fetch to avoid actual network requests during tests
vi.mock('node-fetch', () => {
  return {
    default: vi.fn(),
  }
})

describe('OpenRouter Integration', () => {
  const mockPrompt = 'Create a script that fetches weather data'
  const mockTimestamp = new Date().toISOString()
  const mockScriptId = 'test-script-id-123'
  const mockReasoning = `I'll create a TypeScript script that fetches weather data from an API.
1. First, I'll import the fetch library
2. Then I'll define an interface for the weather data
3. Next, I'll create a function to fetch the data
4. Finally, I'll export a main function that uses this functionality`

  // Mock response setup
  let mockResponseBody: ReadableStream
  let mockResponseWithReasoningBody: ReadableStream

  beforeAll(() => {
    // Create a mock readable stream that will return the script ID and some content
    mockResponseBody = new ReadableStream({
      start(controller) {
        // First send the script ID
        controller.enqueue(new TextEncoder().encode(`__SCRIPT_ID__${mockScriptId}__SCRIPT_ID__`))

        // Then send some mock script content
        controller.enqueue(
          new TextEncoder().encode(`
import fetch from 'node-fetch';

interface WeatherData {
  temperature: number;
  conditions: string;
}

async function getWeather(city: string): Promise<WeatherData> {
  try {
    const response = await fetch(\`https://api.weather.example/\${city}\`);
    if (!response.ok) {
      throw new Error(\`Failed to fetch weather: \${response.status}\`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching weather:', error);
    throw error;
  }
}

export async function main() {
  const weather = await getWeather('New York');
  console.log(\`Temperature: \${weather.temperature}°C, Conditions: \${weather.conditions}\`);
}
        `)
        )

        controller.close()
      },
    })

    // Create a mock readable stream that includes reasoning in XML tags
    mockResponseWithReasoningBody = new ReadableStream({
      start(controller) {
        // First send the script ID
        controller.enqueue(new TextEncoder().encode(`__SCRIPT_ID__${mockScriptId}__SCRIPT_ID__`))

        // Then send some mock script content with reasoning tags
        controller.enqueue(
          new TextEncoder().encode(`
<reasoning>
${mockReasoning}
</reasoning>

import fetch from 'node-fetch';

interface WeatherData {
  temperature: number;
  conditions: string;
}

async function getWeather(city: string): Promise<WeatherData> {
  try {
    const response = await fetch(\`https://api.weather.example/\${city}\`);
    if (!response.ok) {
      throw new Error(\`Failed to fetch weather: \${response.status}\`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching weather:', error);
    throw error;
  }
}

export async function main() {
  const weather = await getWeather('New York');
  console.log(\`Temperature: \${weather.temperature}°C, Conditions: \${weather.conditions}\`);
}
        `)
        )

        controller.close()
      },
    })

    // Mock the fetch implementation
    vi.mocked(nodeFetch).mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        body: mockResponseBody,
        headers: new Map([['Content-Type', 'text/plain']]),
      } as any)
    })

    // Mock global fetch for browser environment
    global.fetch = nodeFetch as any
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  it('should successfully call the OpenRouter API and return a script', async () => {
    const result = await generateDraft(mockPrompt, null, null, mockTimestamp)

    // Verify fetch was called with the correct endpoint
    expect(nodeFetch).toHaveBeenCalledWith(
      '/api/generate-openrouter',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Interaction-Timestamp': mockTimestamp,
        }),
        body: expect.any(String),
      })
    )

    // Check that the request body contains the prompt and extractReasoning flag
    const lastCall = vi.mocked(nodeFetch).mock.calls[0]
    const requestBody = lastCall && lastCall[1] ? JSON.parse(lastCall[1].body as string) : {}
    expect(requestBody).toHaveProperty('prompt', mockPrompt)
    expect(requestBody).toHaveProperty('extractReasoning', true)

    // Verify the response contains the script ID and content
    expect(result).toHaveProperty('scriptId', mockScriptId)
    expect(result).toHaveProperty('script')
    expect(result.script).toContain('import fetch from')
    expect(result.script).toContain('async function getWeather')

    // Since our mock doesn't include reasoning, these should be empty/false
    expect(result).toHaveProperty('reasoning', '')
    expect(result).toHaveProperty('hasReasoning', false)
  })

  it('should handle API errors gracefully', async () => {
    // Mock an error response
    vi.mocked(nodeFetch).mockImplementationOnce(() => {
      return Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ details: 'OpenRouter API error' }),
      } as any)
    })

    // Expect the function to throw an error
    await expect(generateDraft(mockPrompt, null, null, mockTimestamp)).rejects.toThrow(
      'OpenRouter API error'
    )
  })

  it('should handle unauthorized errors', async () => {
    // Mock an unauthorized response
    vi.mocked(nodeFetch).mockImplementationOnce(() => {
      return Promise.resolve({
        ok: false,
        status: 401,
      } as any)
    })

    // Expect the function to throw an unauthorized error
    await expect(generateDraft(mockPrompt, null, null, mockTimestamp)).rejects.toThrow(
      'UNAUTHORIZED'
    )
  })
})
