import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { authOptions } from "../auth/[...nextauth]/route"
import fs from "fs"
import path from "path"

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash-exp",
  generationConfig: {
    maxOutputTokens: 2048,
    temperature: 0.7,
  }
})

// Function to read example scripts
function getExampleScripts() {
  const examplesPath = path.join(process.cwd(), "examples")
  let allExampleContent = ""

  if (fs.existsSync(examplesPath)) {
    const files = fs.readdirSync(examplesPath)
    for (const file of files) {
      const filePath = path.join(examplesPath, file)
      const content = fs.readFileSync(filePath, "utf-8")
      allExampleContent += `\n---\nFile: ${file}\n${content}\n`
    }
  }

  return allExampleContent
}

export async function POST(req: NextRequest) {
  try {
    console.log("Starting script generation process...")
    const session = await getServerSession(authOptions)
    
    // Log the full session for debugging
    console.log("Full session data:", JSON.stringify(session, null, 2))
    
    if (!session?.user?.id) {
      console.error("No valid user ID in session:", { session })
      return NextResponse.json({ 
        error: "Unauthorized - No valid user ID", 
        details: "Please try signing out and signing back in" 
      }, { status: 401 })
    }

    const { prompt } = await req.json()
    if (!prompt) {
      console.error("No prompt provided in request")
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }
    console.log("Received prompt:", prompt)

    // Get the user from the database using ID
    console.log("Looking up user with ID:", session.user.id)
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!dbUser) {
      console.error("User not found in database:", { 
        userId: session.user.id,
        githubId: session.user.githubId
      })
      return NextResponse.json({ 
        error: "User not found in database",
        details: "Please try signing out and signing back in"
      }, { status: 404 })
    }

    console.log("Found user:", { userId: dbUser.id, username: dbUser.username })

    // Get example scripts
    const exampleScripts = getExampleScripts()
    
    // Generate script using Gemini with streaming
    console.log("Starting Gemini generation...")
    const finalPrompt = exampleScripts ? 
      `Here are some example scripts that show the desired style and format:

${exampleScripts}

Based on these examples, create a shell script for this prompt: ${prompt}
The script should be well-commented and include error handling.` :
      `Create a shell script based on this description: ${prompt}\n` +
      `The script should be well-commented and include error handling.`

    const result = await model.generateContentStream(finalPrompt)
    console.log("Gemini stream initialized")

    let fullScript = ''

    // Create a ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log("Starting stream processing...")
          for await (const chunk of result.stream) {
            const chunkText = chunk.text()
            fullScript += chunkText
            controller.enqueue(new TextEncoder().encode(chunkText))
          }
          console.log("Stream processing complete")

          // Save to database after full generation
          try {
            console.log("Saving script to database...")
            await prisma.script.create({
              data: {
                title: prompt.slice(0, 100),
                content: fullScript,
                owner: {
                  connect: {
                    id: dbUser.id
                  }
                }
              },
            })
            console.log("Script saved successfully")
          } catch (dbError) {
            console.error("Database error details:", {
              error: dbError instanceof Error ? {
                message: dbError.message,
                stack: dbError.stack,
                name: dbError.name
              } : dbError,
              scriptLength: fullScript.length,
              userId: dbUser.id
            })
          }

          // Send a final newline to indicate completion
          controller.enqueue(new TextEncoder().encode("\n"))
          controller.close()
        } catch (streamError) {
          console.error("Stream error details:", {
            error: streamError instanceof Error ? {
              message: streamError.message,
              stack: streamError.stack,
              name: streamError.name
            } : streamError,
            scriptLength: fullScript.length,
            lastChunkLength: fullScript.split('\n').pop()?.length
          })
          // Send an error message to the client
          controller.enqueue(new TextEncoder().encode("\nError: Failed to complete script generation"))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error) {
    console.error("Generate error details:", {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      session: await getServerSession(authOptions),
      timestamp: new Date().toISOString()
    })
    return NextResponse.json({ 
      error: "Failed to generate script",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 