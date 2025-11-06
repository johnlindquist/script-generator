import { prompt, type PromptHandler } from 'mcpez'

export const timeoutTest: PromptHandler = async () => {
  const child = Bun.spawn(['cursor-agent', '--model', 'cheetah', '--print', 'only say hi'])
  const response = await child.stdout.text()

  console.error(response)

  return {
    messages: [{ role: 'assistant', content: { type: 'text', text: response } }],
  }
}

prompt(
  'timeout-test',
  {
    description: 'Test the timeout of the MCP server',
    argsSchema: {},
  },
  timeoutTest
)
