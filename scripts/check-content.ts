import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const scripts = await prisma.script.findMany({
    select: {
      title: true,
      content: true,
    },
    take: 5,
  })

  console.log('Found', scripts.length, 'scripts\n')

  scripts.forEach((script, i) => {
    console.log(`\n--- Script ${i + 1}: ${script.title} ---`)
    console.log(script.content.slice(0, 500), '...')

    // Check for markdown artifacts
    const hasMarkdownLink = script.content.includes('[')
    const hasHtmlTags = /<[^>]*>/g.test(script.content)
    const hasMarkdownHeaders = script.content.includes('#')

    if (hasMarkdownLink || hasHtmlTags || hasMarkdownHeaders) {
      console.log('\nPossible markdown artifacts found:')
      if (hasMarkdownLink) console.log('- Contains markdown links')
      if (hasHtmlTags) console.log('- Contains HTML tags')
      if (hasMarkdownHeaders) console.log('- Contains markdown headers')
    }
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
