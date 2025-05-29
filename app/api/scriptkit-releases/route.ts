import { NextResponse } from 'next/server'
import { getAllScriptKitReleases } from '@/lib/get-scriptkit-releases'

// This route is completely static and will only update on new deployments
export const dynamic = 'force-static'

export async function GET() {
  try {
    const releases = await getAllScriptKitReleases()
    return NextResponse.json(releases)
  } catch (error: unknown) {
    console.error('Error in /api/scriptkit-releases:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch releases' },
      { status: 500 }
    )
  }
}
