import { tool } from 'mcpez'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

tool(
  'prompts/list',
  {
    description: 'List all available prompts in the prompts directory',
  },
  async () => {
    try {
      const promptsDir = join(process.cwd(), 'prompts')
      const files = await readdir(promptsDir)

      const prompts = await Promise.all(
        files
          .filter(file => file.endsWith('.md'))
          .map(async file => {
            const filePath = join(promptsDir, file)
            const content = await readFile(filePath, 'utf-8')
            const name = file.replace('.md', '')

            return {
              name,
              filename: file,
              content: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
              size: content.length,
              preview: content.split('\n').slice(0, 3).join('\n'),
            }
          })
      )

      return {
        prompts: prompts.sort((a, b) => a.name.localeCompare(b.name)),
      }
    } catch (error) {
      throw new Error(
        `Failed to list prompts: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
)

tool(
  'prompts/get',
  {
    description: 'Get the full content of a specific prompt',
  },
  async ({ name }) => {
    try {
      const promptsDir = join(process.cwd(), 'prompts')
      const filePath = join(promptsDir, `${name}.md`)
      const content = await readFile(filePath, 'utf-8')

      return {
        name,
        filename: `${name}.md`,
        content,
        size: content.length,
      }
    } catch (error) {
      throw new Error(
        `Failed to get prompt "${name}": ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
)
