import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

async function testPromptsList() {
  try {
    const promptsDir = join(process.cwd(), 'prompts')
    console.log('Prompts directory:', promptsDir)

    const files = await readdir(promptsDir)
    console.log('Files found:', files)

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

    console.log('Prompts found:', prompts.length)
    prompts.forEach(prompt => {
      console.log(`- ${prompt.name}: ${prompt.size} chars`)
    })

    return {
      prompts: prompts.sort((a, b) => a.name.localeCompare(b.name)),
    }
  } catch (error) {
    console.error('Error:', error)
    throw new Error(
      `Failed to list prompts: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

// Run the test
testPromptsList()
  .then(result => {
    console.log(
      'Success! Found prompts:',
      result.prompts.map(p => p.name)
    )
  })
  .catch(error => {
    console.error('Test failed:', error)
    process.exit(1)
  })
