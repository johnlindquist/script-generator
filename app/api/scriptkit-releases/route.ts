import { NextResponse } from 'next/server'
import {
  getMacIntelRelease,
  getMacSiliconRelease,
  getWindowsx64Release,
  getWindowsarm64Release,
  getLinuxx64Release,
  getLinuxarm64Release,
  getBetaRelease,
} from '@/lib/get-scriptkit-releases'

// This route is completely static and will only update on new deployments
export const dynamic = 'force-static'

export async function GET() {
  try {
    const [macIntel, macSilicon, winx64, winarm64, linuxx64, linuxarm64, beta] = await Promise.all([
      getMacIntelRelease(),
      getMacSiliconRelease(),
      getWindowsx64Release(),
      getWindowsarm64Release(),
      getLinuxx64Release(),
      getLinuxarm64Release(),
      getBetaRelease(),
    ])

    return NextResponse.json({
      macIntel,
      macSilicon,
      winx64,
      winarm64,
      linuxx64,
      linuxarm64,
      beta,
    })
  } catch (error: unknown) {
    console.error(error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch releases' },
      { status: 500 }
    )
  }
}
