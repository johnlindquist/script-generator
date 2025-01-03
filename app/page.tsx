import { getServerSession } from 'next-auth'
import { authOptions } from './api/auth/[...nextauth]/route'
import NavBar from '@/components/NavBar'
import ScriptGenerationClient from '@/components/ScriptGenerationClient'
import ViewToggle from '@/components/ViewToggle'
import { STRINGS } from '@/lib/strings'
import ScriptKitDownload from '@/components/ScriptKitDownload'
import {
  getMacIntelRelease,
  getMacSiliconRelease,
  getWindowsx64Release,
  getWindowsarm64Release,
  getLinuxx64Release,
  getLinuxarm64Release,
  getBetaRelease,
} from '@/lib/get-scriptkit-releases'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const session = await getServerSession(authOptions)

  const [macIntel, macSilicon, winx64, winarm64, linuxx64, linuxarm64, beta] = await Promise.all([
    getMacIntelRelease(),
    getMacSiliconRelease(),
    getWindowsx64Release(),
    getWindowsarm64Release(),
    getLinuxx64Release(),
    getLinuxarm64Release(),
    getBetaRelease(),
  ])

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
      <NavBar isAuthenticated={!!session} />
      <div className="container mx-auto px-4 sm:px-4 py-8">
        <div className="mb-4 text-center">
          <p className="text-amber-400/80 text-sm">{STRINGS.HOME.prototype.warning}</p>
        </div>

        {/* Script Generation Client - always visible */}
        <ScriptGenerationClient isAuthenticated={!!session} />

        <hr className="my-8 border-zinc-800" />

        {/* Community Scripts Section */}
        <div className="mt-12">
          <ViewToggle />
        </div>

        <hr className="my-8 border-zinc-800" />

        <div className="flex justify-center items-center w-full">
          <ScriptKitDownload
            macIntelRelease={macIntel}
            macSiliconRelease={macSilicon}
            windowsx64Release={winx64}
            windowsarm64Release={winarm64}
            linuxx64Release={linuxx64}
            linuxarm64Release={linuxarm64}
            betaRelease={beta}
          />
        </div>
      </div>
    </main>
  )
}
