import { getServerSession } from 'next-auth'
import { authOptions } from './api/auth/[...nextauth]/route'
import ScriptGenerationClient from '@/components/ScriptGenerationClient'
import ViewToggle from '@/components/ViewToggle'
import ScriptSearch from '@/components/ScriptSearch'
import ScriptKitDownload from '@/components/ScriptKitDownload'
import SponsorBackground from '@/components/SponsorBackground'
import Testimonials from '@/components/Testimonials'
import { getRandomHeading } from '@/lib/getRandomHeading'
import { getRandomSuggestions } from '@/lib/getRandomSuggestions'
import { getTestimonials } from '@/lib/get-testimonials'
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
  const heading = getRandomHeading()
  const suggestions = getRandomSuggestions()
  const testimonials = getTestimonials()

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
    <main className="relative min-h-screen bg-gradient-to-b from-zinc-900 to-black">
      <div className="relative z-[1] max-w-7xl mx-auto px-4">
        <div className="relative">
          <div className="absolute inset-0">
            <SponsorBackground />
          </div>

          <ScriptGenerationClient
            isAuthenticated={!!session}
            heading={heading}
            suggestions={suggestions}
          />
        </div>

        <hr className="my-8 border-zinc-800" />

        <div className="mb-8">
          <ScriptSearch />
        </div>

        <div className="mt-12">
          <ViewToggle />
        </div>

        <hr className="my-8 border-zinc-800" />

        <div className="mb-12">
          <Testimonials testimonials={testimonials} />
        </div>

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
