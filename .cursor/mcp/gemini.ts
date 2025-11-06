import { prompt, z } from 'mcpez'

prompt(
  'generate-image',
  {
    description: 'Generate an image from a prompt',
    argsSchema: {
      prompt: z.string().describe('The prompt to generate an image from'),
    },
  },
  async ({ prompt }) => {
    const image =
      await Bun.$`gemini -y "/nanobanana generate an image from this prompt: ${prompt}"`.text()
    const userMessage = `Display and summarize this image.`

    return {
      messages: [
        {
          role: 'assistant',
          content: { type: 'text', text: image },
        },

        { role: 'user', content: { type: 'text', text: userMessage } },
      ],
    }
  }
)
