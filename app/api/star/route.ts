import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "../auth/[...nextauth]/route"
import { logInteraction } from "@/lib/interaction-logger"
import { StarRequestSchema } from "@/lib/schemas"

export async function POST(req: NextRequest) {
  const interactionTimestamp = req.headers.get('Interaction-Timestamp') || new Date().toISOString()

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse and validate request body
    const rawBody = await req.json()
    const parseResult = StarRequestSchema.safeParse(rawBody)

    if (!parseResult.success) {
      await logInteraction(interactionTimestamp, 'serverRoute', 'Invalid star request body', {
        errors: parseResult.error.errors,
      })
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.errors }, { status: 400 })
    }

    const { scriptId } = parseResult.data

    // Check if already favorited (using favorites as stars)
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_scriptId: {
          userId: session.user.id,
          scriptId,
        },
      },
    })

    if (existingFavorite) {
      // Remove favorite
      await prisma.favorite.delete({
        where: {
          userId_scriptId: {
            userId: session.user.id,
            scriptId,
          },
        },
      })

      await logInteraction(interactionTimestamp, 'serverRoute', 'Script unstarred', {
        userId: session.user.id,
        scriptId,
      })

      return NextResponse.json({ starred: false })
    } else {
      // Add favorite
      await prisma.favorite.create({
        data: {
          userId: session.user.id,
          scriptId,
        },
      })

      await logInteraction(interactionTimestamp, 'serverRoute', 'Script starred', {
        userId: session.user.id,
        scriptId,
      })

      return NextResponse.json({ starred: true })
    }
  } catch (error) {
    await logInteraction(interactionTimestamp, 'serverRoute', 'Error in star route', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 