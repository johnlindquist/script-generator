import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { extractScriptFromMarkdown } from '@/lib/generation'

const GITHUB_TOKEN = process.env.GITHUB_ACCESS_TOKEN || ''

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

const ImportSchema = z.array(ScriptImportSchema)

async function findOrCreateGitHubUser(username: string) {
  // First try to find the user in our database
  let user = await prisma.user.findUnique({
    where: { username },
  })

  if (!user) {
    // If user doesn't exist, fetch their details from GitHub
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

    // Create the user in our database
    user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        username: githubUser.login,
        fullName: githubUser.name || githubUser.login,
      },
    })
  }

  return user
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const importedScripts = ImportSchema.parse(body)

    const createdScripts = []
    const errors = []

    // Get the current user's details
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true, fullName: true, id: true },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    for (const scriptData of importedScripts) {
      try {
        const scriptTitle = scriptData.title || scriptData.name

        // If a user is specified, find or create their account
        let scriptOwner = currentUser
        if (scriptData.user) {
          try {
            scriptOwner = await findOrCreateGitHubUser(scriptData.user)
          } catch (error) {
            console.error(`Failed to find/create user ${scriptData.user}:`, error)
            // Fall back to current user if GitHub user lookup fails
            scriptOwner = currentUser
          }
        }

        const existingScript = await prisma.script.findFirst({
          where: {
            ownerId: scriptOwner.id,
            title: scriptTitle,
          },
        })

        if (existingScript) {
          errors.push({
            name: scriptTitle,
            message: 'Script with this name already exists',
          })
          continue
        }

        // Extract code from markdown content if present
        const cleanedContent = extractScriptFromMarkdown(scriptData.content)

        // Create script with the GitHub user as owner
        const script = await prisma.script.create({
          data: {
            title: scriptTitle!,
            content: cleanedContent,
            summary: scriptData.description || undefined,
            ownerId: scriptOwner.id,
            saved: true,
            status: 'ACTIVE',
            // Store github URL in gistUrl if provided
            gistUrl: scriptData.github || undefined,
            // Store twitter handle in dashedName if provided
            dashedName: scriptData.user || scriptOwner.username,
            // Store author name in uppercaseName if provided
            uppercaseName: scriptData.author || scriptOwner.fullName || scriptOwner.username,
          },
        })
        createdScripts.push(script)
      } catch (error) {
        console.error('Error creating script:', error)
        errors.push({
          name: scriptData.title || scriptData.name || 'Unknown',
          message: error instanceof Error ? error.message : 'Failed to create script',
        })
      }
    }

    return NextResponse.json({
      message: `Successfully imported ${createdScripts.length} scripts`,
      errors: errors.length > 0 ? errors : undefined,
      createdScripts,
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to import scripts',
      },
      { status: 500 }
    )
  }
}
