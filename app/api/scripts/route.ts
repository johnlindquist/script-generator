import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET() {
  try {
    const scripts = await prisma.script.findMany({
      orderBy: { createdAt: "desc" },
      include: { owner: true },
    })

    return NextResponse.json(scripts)
  } catch (error) {
    console.error("Failed to fetch scripts:", error)
    return NextResponse.json(
      { error: "Failed to fetch scripts" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { prompt, code } = await request.json()
    
    if (!prompt || !code) {
      return NextResponse.json(
        { error: "Prompt and code are required" },
        { status: 400 }
      )
    }

    const script = await prisma.script.create({
      data: {
        title: prompt.split('\n')[0].slice(0, 50),
        summary: prompt,
        content: code,
        ownerId: session.user.id,
      },
      include: {
        owner: true,
      },
    })

    return NextResponse.json(script)
  } catch (error) {
    console.error("Failed to create script:", error)
    return NextResponse.json(
      { error: "Failed to create script" },
      { status: 500 }
    )
  }
} 