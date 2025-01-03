import { PrismaClient, User } from '@prisma/client'
import { z } from 'zod'
import fs from 'fs/promises'
import path from 'path'
import { extractScriptFromMarkdown } from '../lib/generation'
import dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()
const GITHUB_TOKEN = process.env.GITHUB_ACCESS_TOKEN || ''

interface ImportError {
  name: string
  message: string
}

const ScriptImportSchema = z
  .object({
    name: z.string().optional(),
    title: z.string().optional(),
    description: z.string().nullish(),
    content: z.string(),
    command: z.string().nullish(),
    author: z.string().nullish(),
    github: z.string().nullish(),
    twitter: z.string().nullish(),
    user: z.string().nullish(),
    url: z.string().nullish(),
    avatar: z.string().nullish(),
    discussion: z.string().nullish(),
  })
  .refine(data => data.name || data.title, {
    message: 'Either name or title must be provided',
  })
  .refine(data => data.user, {
    message: 'User must be provided',
  })

const ImportSchema = z.array(ScriptImportSchema)

// Cache for GitHub users to avoid duplicate requests
const userCache = new Map<string, User>()

async function findOrCreateGitHubUser(username: string): Promise<User> {
  // Check cache first
  const cachedUser = userCache.get(username)
  if (cachedUser) {
    return cachedUser
  }

  try {
    // Fetch GitHub user data first
    const res = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch GitHub user: ${username}`)
    }

    const githubUser = await res.json()

    // Use upsert to either create or update the user
    const user = await prisma.user.upsert({
      where: { username: githubUser.login },
      update: {
        fullName: githubUser.name || githubUser.login,
      },
      create: {
        id: crypto.randomUUID(),
        username: githubUser.login,
        fullName: githubUser.name || githubUser.login,
      },
    })

    // Cache the user
    userCache.set(username, user)
    return user
  } catch (error) {
    console.error(`Error fetching/creating user ${username}:`, error)
    throw error
  }
}

async function main() {
  try {
    // Read the JSON file
    const jsonPath = path.join(process.cwd(), 'data', 'share.json')
    const jsonContent = await fs.readFile(jsonPath, 'utf-8')
    const scripts = ImportSchema.parse(JSON.parse(jsonContent))

    console.log(`Found ${scripts.length} scripts to import`)
    console.log('Starting import process...\n')

    const createdScripts = []
    const errors: ImportError[] = []

    // Process scripts in chunks to avoid overwhelming the database
    const chunkSize = 50
    const totalChunks = Math.ceil(scripts.length / chunkSize)

    for (let i = 0; i < scripts.length; i += chunkSize) {
      const currentChunk = Math.floor(i / chunkSize) + 1
      console.log(
        `\nProcessing chunk ${currentChunk}/${totalChunks} (${i + 1}-${Math.min(i + chunkSize, scripts.length)} of ${scripts.length} scripts)`
      )

      const chunk = scripts.slice(i, i + chunkSize)

      await Promise.all(
        chunk.map(async scriptData => {
          try {
            const scriptTitle = scriptData.title || scriptData.name

            if (!scriptData.user) {
              throw new Error('User is required')
            }

            // Get or create the user account
            const scriptOwner = await findOrCreateGitHubUser(scriptData.user)

            // Check if script already exists
            const existingScript = await prisma.script.findFirst({
              where: {
                ownerId: scriptOwner.id,
                title: scriptTitle,
              },
            })

            if (existingScript) {
              errors.push({
                name: scriptTitle!,
                message: 'Script with this name already exists',
              })
              return
            }

            // Extract code from markdown content if present
            const cleanedContent = extractScriptFromMarkdown(scriptData.content)

            // Create script
            const script = await prisma.script.create({
              data: {
                title: scriptTitle!,
                content: cleanedContent,
                summary: scriptData.description || undefined,
                saved: true,
                status: 'ACTIVE',
                gistUrl: scriptData.github || undefined,
                dashedName: scriptData.user,
                uppercaseName: scriptData.author || scriptOwner.fullName || scriptOwner.username,
                ownerId: scriptOwner.id,
              },
            })
            createdScripts.push(script)
            console.log(`✓ Created: ${scriptTitle} (by ${scriptOwner.username})`)
          } catch (error) {
            console.error(
              `✗ Failed: ${scriptData.title || scriptData.name || 'Unknown'} - ${error instanceof Error ? error.message : 'Failed to create script'}`
            )
            errors.push({
              name: scriptData.title || scriptData.name || 'Unknown',
              message: error instanceof Error ? error.message : 'Failed to create script',
            })
          }
        })
      )
    }

    console.log(`\nImport Summary:`)
    console.log(`- Total scripts found: ${scripts.length}`)
    console.log(`- Successfully imported: ${createdScripts.length} scripts`)
    console.log(`- Failed imports: ${errors.length} scripts`)
    console.log(
      `- Scripts not processed: ${scripts.length - (createdScripts.length + errors.length)} scripts`
    )

    if (errors.length > 0) {
      console.log('\nDetailed Errors:')
      errors.forEach(error => {
        console.log(`- ${error.name}: ${error.message}`)
      })
    }
  } catch (error) {
    console.error('Import failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Check if GITHUB_ACCESS_TOKEN is set
if (!process.env.GITHUB_ACCESS_TOKEN) {
  console.warn('WARNING: GITHUB_ACCESS_TOKEN not set. GitHub user lookups may be rate limited.')
}

main()
