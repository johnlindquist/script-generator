import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "../auth/[...nextauth]/route"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { scriptId } = await req.json()
    if (!scriptId) {
      return NextResponse.json({ error: "Script ID is required" }, { status: 400 })
    }

    // Check if script exists
    const script = await prisma.script.findUnique({
      where: { id: scriptId },
    })

    if (!script) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 })
    }

    // Check if user already liked this script
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_scriptId: {
          userId: session.user.id,
          scriptId,
        },
      },
    })

    let isLiked: boolean
    if (existingLike) {
      // Remove like if it exists
      await prisma.like.delete({
        where: { id: existingLike.id },
      })
      isLiked = false
    } else {
      // Create new like if it doesn't exist
      await prisma.like.create({
        data: {
          userId: session.user.id,
          scriptId,
        },
      })
      isLiked = true
    }

    // Get updated like count
    const likeCount = await prisma.like.count({
      where: { scriptId },
    })

    return NextResponse.json({ isLiked, likeCount })
  } catch (error) {
    console.error("Like error:", error)
    return NextResponse.json(
      { error: "Failed to toggle like" },
      { status: 500 }
    )
  }
} 