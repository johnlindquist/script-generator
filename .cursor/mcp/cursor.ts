import { log, prompt, type PromptHandler } from 'mcpez'

export const summarize: PromptHandler = async () => {
  try {
    console.error('Calling cursor-agent with clean environment...')

    const prompt = `Summarize the tsconfig.json file`
    const response = Bun.spawn(['cursor-agent', '--model', 'cheetah', '--print', prompt], {
      env: {
        ...process.env,
        CURSOR_AGENT: undefined,
        CURSOR_CLI: undefined,
      },
    })

    console.error(`cursor-agent response:`, JSON.stringify(response, null, 2))
    const stdout = await response.stdout.text()
    console.error(`cursor-agent stdout:`, stdout)

    return {
      messages: [
        { role: 'assistant', content: { type: 'text', text: stdout } },
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please repeat back your last message followed by the word "COMPLETE"`,
          },
        },
      ],
    }
  } catch (error) {
    log.error(error)
    return {
      messages: [{ role: 'user', content: { type: 'text', text: `Error summarizing: ${error}` } }],
    }
  }
}

prompt(
  'summarize',
  {
    description: 'Summarize a file',
    argsSchema: {},
  },
  summarize
)
