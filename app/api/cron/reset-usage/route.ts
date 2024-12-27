import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Vercel cron job to reset daily usage counts
// This endpoint will be called daily at midnight UTC
export async function GET(request: Request) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Delete all usage records from previous days
    const result = await prisma.usage.deleteMany({
      where: {
        date: {
          lt: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Reset ${result.count} usage records`,
    })
  } catch (error) {
    console.error("Failed to reset usage:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Failed to reset usage counts" 
    }, { status: 500 })
  }
} 