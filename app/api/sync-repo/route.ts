import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { SyncRepoSchema } from '@/lib/schemas'

const GITHUB_TOKEN = process.env.GITHUB_ACCESS_TOKEN || ''

function parseRepoUrl(url: string): { owner: string; repoName: string } | null {
  try {
    const cleaned = url.replace(/^https?:\/\/github\.com\//i, '')
    const parts = cleaned.split('/')
    const owner = parts[0]
    const repoName = parts[1]?.replace('.git', '')

    if (!owner || !repoName) {
      return null
    }

    return { owner, repoName }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parseResult = SyncRepoSchema.safeParse(body)
    
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.errors }, { status: 400 })
    }
    
    const { repoUrl } = parseResult.data

    const parsed = parseRepoUrl(repoUrl)
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid GitHub repository URL' }, { status: 400 })
    }

    const { owner, repoName } = parsed

    // Fetch the scripts directory contents
    const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/scripts`, {
      headers: {
        ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (res.status === 404) {
      return NextResponse.json(
        { error: 'No scripts directory found in the repository' },
        { status: 404 }
      )
    }

    if (!res.ok) {
      const errorBody = await res.json() as { message?: string }
      return NextResponse.json(
        { error: errorBody?.message || 'Failed to fetch scripts from GitHub' },
        { status: res.status }
      )
    }

    const files = await res.json() as Array<{ name: string; path: string; download_url: string; type?: string }>

    // Filter for TypeScript files
    const scriptFiles = files.filter(
      (f) => f.type === 'file' && f.name.endsWith('.ts')
    )

    // Limit the number of scripts to 200
    if (scriptFiles.length > 200) {
      return NextResponse.json(
        { error: 'Repository contains too many scripts. Maximum allowed is 200.' },
        { status: 400 }
      )
    }

    // Find or create the GitHub user
    let ownerUser = await prisma.user.findUnique({
      where: {
        username: owner,
      },
    })

    if (!ownerUser) {
      ownerUser = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          username: owner,
          fullName: owner,
        },
      })
    }

    // Import each script
    const importedScripts = []
    for (const file of scriptFiles) {
      const rawRes = await fetch(file.download_url)
      const content = await rawRes.text()
      const title = file.name.replace(/\.ts$/, '')

      const script = await prisma.script.create({
        data: {
          ownerId: ownerUser.id,
          title,
          content,
          saved: true,
          status: 'ACTIVE',
          dashedName: title.toLowerCase().replace(/\s+/g, '-'),
        },
      })

      importedScripts.push(script)
    }

    return NextResponse.json({
      message: `Successfully imported ${importedScripts.length} scripts`,
      scripts: importedScripts,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync repository' },
      { status: 500 }
    )
  }
}
