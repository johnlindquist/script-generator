import { prompt, z } from 'mcpez'

prompt(
  'health-check',
  {
    description: 'Simple health check to verify MCP server is working',
    argsSchema: {
      message: z.string().optional().describe('Optional test message'),
    },
  },
  async ({ message = 'MCP server is healthy' }) => {
    try {
      const timestamp = new Date().toISOString()
      const response = `${message} - ${timestamp}`

      return {
        messages: [
          {
            role: 'assistant',
            content: { type: 'text', text: response },
          },
        ],
      }
    } catch (error) {
      return {
        messages: [
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          },
        ],
      }
    }
  }
)
