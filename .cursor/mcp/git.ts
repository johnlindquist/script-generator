import { prompt, z } from 'mcpez'

prompt(
  'latest-commits',
  {
    description: 'Get the latest commits from the current branch',
    argsSchema: {
      numberOfCommits: z.string().describe('The number of commits to summarize'),
    },
  },
  async ({ numberOfCommits }) => {
    const commits = await Bun.$`git log -n ${numberOfCommits} --pretty=format:"%h - %s"`
      .text()
      .timeout(15000)
    const userMessage = `Please summarize these commits: ${commits}`

    return {
      messages: [
        {
          role: 'assistant',
          content: { type: 'text', text: commits },
        },

        { role: 'user', content: { type: 'text', text: userMessage } },
      ],
    }
  }
)
