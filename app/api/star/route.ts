import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { scriptId } = await req.json()
    if (!scriptId) {
      return NextResponse.json({ error: "Script ID is required" }, { status: 400 })
    }

    // Get the current script
    const script = await prisma.script.findUnique({
      where: { id: scriptId },
    })

    if (!script) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 })
    }

    // Toggle the starred status
    const updatedScript = await prisma.script.update({
      where: { id: scriptId },
      data: { starred: !script.starred },
    })

    return NextResponse.json({ script: updatedScript })
  } catch (error) {
    console.error("Star error:", error)
    return NextResponse.json(
      { error: "Failed to update star status" },
      { status: 500 }
    )
  }
} 