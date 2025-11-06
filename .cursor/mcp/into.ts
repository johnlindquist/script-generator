import { prompt, z } from 'mcpez'

prompt(
  'into.md',
  {
    description: 'Get a webpage in markdown',
    argsSchema: {
      url: z.string().describe('The URL to generate a summary of'),
    },
  },
  async ({ url }) => {
    const response = await fetch(`https://into.md/${url}`)
    const text = await response.text()

    return {
      messages: [
        {
          role: 'assistant',
          content: { type: 'text', text },
        },
      ],
    }
  }
)
