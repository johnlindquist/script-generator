import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { authOptions } from '../auth/[...nextauth]/route'
import fs from 'fs'
import path from 'path'
import { generateDashedName, generateUppercaseName } from '@/lib/names'

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  generationConfig: {
    maxOutputTokens: 2048,
    temperature: 0.7,
  },
})

// Library search prompt enhancement
const LIBRARY_SEARCH_PROMPT = `
Before generating the code, search for and recommend the most suitable npm packages and services for this task. Consider:
- Package download statistics and popularity
- GitHub stars and recent activity
- Maintenance status and last updated date
- Security vulnerabilities and updates
- Documentation quality and examples
- Community support and ecosystem

Format your recommendations before the code implementation.
Prefer using pnpm for package installation commands.
`

// Function to read example scripts
function getExampleScripts() {
  const examplesPath = path.join(process.cwd(), 'examples')
  const avoidAbusePath = path.join(process.cwd(), 'prompts', 'avoid-abuse.md')
  let allExampleContent = ''

  try {
    if (!fs.existsSync(examplesPath)) {
      console.warn(`Examples directory not found at ${examplesPath}`)
      return ''
    }

    const files = fs
      .readdirSync(examplesPath)
      .filter(file => file.endsWith('.ts') && !file.startsWith('.')) // Only .ts files, no hidden files
      .sort() // Ensure consistent ordering

    if (files.length === 0) {
      console.warn('No .ts files found in examples directory')
      return ''
    }

    console.log(`Found ${files.length} example scripts`)

    for (const file of files) {
      try {
        const filePath = path.join(examplesPath, file)
        const stats = fs.statSync(filePath)

        // Skip if not a file or too large (> 100KB)
        if (!stats.isFile() || stats.size > 100 * 1024) {
          console.warn(`Skipping ${file}: ${!stats.isFile() ? 'Not a file' : 'Too large'}`)
          continue
        }

        const content = fs.readFileSync(filePath, 'utf-8')
        allExampleContent += `\n---\nFile: ${file}\n${content}\n`
      } catch (fileError) {
        console.error(`Error reading file ${file}:`, fileError)
        // Continue with other files
      }
    }

    return (
      allExampleContent +
      (fs.existsSync(avoidAbusePath) ? '\n\n' + fs.readFileSync(avoidAbusePath, 'utf-8') : '')
    )
  } catch (error) {
    console.error('Error reading example scripts:', error)
    return '' // Return empty string on error, allowing generation to continue
  }
}

// Function to read docs-mini.md
function getDocsContent() {
  const docsPath = path.join(process.cwd(), 'prompts', 'docs-mini.md')
  const promptPath = path.join(process.cwd(), 'prompts', 'prompt.md')
  try {
    if (!fs.existsSync(docsPath)) {
      console.warn(`Docs file not found at ${docsPath}`)
      return ''
    }

    let content = fs.readFileSync(docsPath, 'utf-8')

    // Append prompt.md content if it exists
    if (fs.existsSync(promptPath)) {
      const promptContent = fs.readFileSync(promptPath, 'utf-8')
      content += '\n\n' + promptContent
    }

    return content
  } catch (error) {
    console.error('Error reading docs content:', error)
    return '' // Return empty string on error, allowing generation to continue
  }
}

// Helper function to clean code fences and language specifiers
function cleanCodeFences(text: string): string {
  // First, remove code fences with inline language specifiers
  let cleaned = text.replaceAll(/(```|~~~)[ ]?(ts|typescript)?/gi, '')

  // Then remove any "typescript" that appears alone on a line (case insensitive)
  cleaned = cleaned.replace(/^typescript\s*$/gim, '')

  // Clean up any double newlines that might have been created
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n')

  return cleaned.trim()
}

// Helper function to detect partial code fences at the end
function getPartialFence(text: string): string {
  const match = text.match(/(`+$|~+$)/)
  return match ? match[0] : ''
}

export async function POST(req: NextRequest) {
  try {
    console.log('Starting script generation process...')
    const session = await getServerSession(authOptions)

    // Log the full session for debugging
    console.log('Full session data:', JSON.stringify(session, null, 2))

    if (!session?.user?.id) {
      console.error('No valid user ID in session:', { session })
      return NextResponse.json(
        {
          error: 'Unauthorized - No valid user ID',
          details: 'Please try signing out and signing back in',
        },
        { status: 401 }
      )
    }

    const { prompt, requestId } = await req.json()
    if (!prompt) {
      console.error('No prompt provided in request')
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    if (!requestId || requestId.trim().length === 0) {
      console.error('No valid requestId provided')
      return NextResponse.json({ error: 'A valid requestId is required' }, { status: 400 })
    }

    console.log('Received prompt:', prompt)

    // Get the user from the database using ID
    console.log('Looking up user with ID:', session.user.id)
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!dbUser) {
      console.error('User not found in database:', {
        userId: session.user.id,
        githubId: session.user.githubId,
      })
      return NextResponse.json(
        {
          error: 'User not found in database',
          details: 'Please try signing out and signing back in',
        },
        { status: 404 }
      )
    }

    console.log('Found user:', { userId: dbUser.id, username: dbUser.username })

    // Get example scripts and docs content
    const exampleScripts = getExampleScripts()
    const docsContent = getDocsContent()

    // Generate script using Gemini with streaming
    console.log('Starting Gemini generation...')
    const finalPrompt = exampleScripts
      ? `You are a TypeScript script generator that creates scripts in the exact style of the examples below.
Each script should be a standalone TypeScript file that can be run directly.

${LIBRARY_SEARCH_PROMPT}

Here is the documentation for available functions and utilities:

${docsContent}

Here are example scripts that demonstrate the required format and style:

${exampleScripts}

Based on these examples, create a new script that follows the EXACT SAME format and style for this prompt:
${prompt}

Requirements:
1. Follow the EXACT same format as the examples
2. Include proper error handling like the examples
3. Include clear comments explaining the code
4. Make the script a standalone .ts file that can be run directly
5. Use the same coding style and patterns shown in the examples
6. Include all necessary imports at the top
7. Export a default async function like the examples
8. Use the appropriate functions and utilities from the documentation

Generate ONLY the script content, no additional explanations or markdown:`
      : `Create a TypeScript script based on this description: ${prompt}

${LIBRARY_SEARCH_PROMPT}

Here is the documentation for available functions and utilities:

${docsContent}

Requirements:
1. Make it a standalone .ts file that can be run directly
2. Include proper error handling
3. Include clear comments explaining the code
4. Include all necessary imports at the top
5. Export a default async function
6. The script should be well-documented and production-ready
7. Use the appropriate functions and utilities from the documentation

Generate ONLY the script content, no additional explanations or markdown:`

    const result = await model.generateContentStream(finalPrompt)
    console.log('Gemini stream initialized')

    let fullScript = ''

    // Create a ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('Starting stream processing...')
          let carryover = ''

          for await (const chunk of result.stream) {
            // Combine carryover with new chunk
            let combined = carryover + chunk.text()

            // Clean code fences and language specifiers
            combined = cleanCodeFences(combined)

            // Check for partial fences at the end
            const partialFence = getPartialFence(combined)
            if (partialFence) {
              carryover = partialFence
              combined = combined.slice(0, -carryover.length)
            } else {
              carryover = ''
            }

            // Add to full script and send to client
            fullScript += combined
            controller.enqueue(new TextEncoder().encode(combined))
          }

          // Handle any remaining carryover
          if (carryover.length > 0) {
            carryover = ''
          }

          console.log('Stream processing complete')

          // Remove the database save from here since we'll do it after streaming
          controller.enqueue(new TextEncoder().encode('\n'))
          controller.close()
        } catch (streamError) {
          console.error('Stream error details:', {
            error:
              streamError instanceof Error
                ? {
                    message: streamError.message,
                    stack: streamError.stack,
                    name: streamError.name,
                  }
                : streamError,
            scriptLength: fullScript.length,
          })
          controller.enqueue(
            new TextEncoder().encode('\nError: Failed to complete script generation')
          )
          controller.close()
        }
      },
    })

    // After streaming is complete, save the script
    const script = await prisma.script.create({
      data: {
        content: fullScript,
        title: prompt.slice(0, 100),
        summary: prompt,
        requestId,
        ownerId: session.user.id,
        saved: false,
        dashedName: generateDashedName(prompt.slice(0, 100)),
        uppercaseName: generateUppercaseName(prompt.slice(0, 100)),
      },
    })

    // Return the stream with the script ID
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Script-Id': script.id,
      },
    })
  } catch (error) {
    console.error('Generate error details:', {
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : error,
      session: await getServerSession(authOptions),
      timestamp: new Date().toISOString(),
    })
    return NextResponse.json(
      {
        error: 'Failed to generate script',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
