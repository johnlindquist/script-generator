import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "../../auth/[...nextauth]/route"

export async function PUT(req: NextRequest, { params }: { params: { scriptId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { content } = await req.json()
    const scriptId = params.scriptId

    // Verify ownership
    const script = await prisma.script.findUnique({
      where: { id: scriptId }
    })

    if (!script) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 })
    }

    if (script.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Update script
    const updatedScript = await prisma.script.update({
      where: { id: scriptId },
      data: { content },
    })

    return NextResponse.json(updatedScript)
  } catch (error) {
    console.error("Update script error:", error)
    return NextResponse.json(
      { error: "Failed to update script" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { scriptId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const script = await prisma.script.findUnique({
      where: { id: params.scriptId },
    })

    if (!script) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 })
    }

    if (script.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Not authorized to delete this script" },
        { status: 403 }
      )
    }

    await prisma.script.delete({
      where: { id: params.scriptId },
    })

    return NextResponse.json({ message: "Script deleted successfully" })
  } catch (error) {
    console.error("Failed to delete script:", error)
    return NextResponse.json(
      { error: "Failed to delete script" },
      { status: 500 }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { scriptId: string } }
) {
  try {
    const script = await prisma.script.findUnique({
      where: { id: params.scriptId },
      include: { owner: true },
    })

    if (!script) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 })
    }

    return NextResponse.json(script)
  } catch (error) {
    console.error("Get script error:", error)
    return NextResponse.json({ error: "Failed to get script" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { scriptId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const script = await prisma.script.findUnique({
      where: { id: params.scriptId },
    })

    if (!script) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 })
    }

    if (script.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Not authorized to modify this script" },
        { status: 403 }
      )
    }

    const { saved } = await request.json()

    const updatedScript = await prisma.script.update({
      where: { id: params.scriptId },
      data: { saved },
    })

    return NextResponse.json(updatedScript)
  } catch (error) {
    console.error("Failed to update script:", error)
    return NextResponse.json(
      { error: "Failed to update script" },
      { status: 500 }
    )
  }
} 