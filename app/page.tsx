import { getServerSession } from 'next-auth'
import { authOptions } from './api/auth/[...nextauth]/route'
import ScriptGenerationClient from '@/components/ScriptGenerationClient'
import ViewToggle from '@/components/ViewToggle'
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
import React from 'react'
import ScrollToContent from '@/components/ScrollToContent'

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
    <div id="layout" className="relative min-h-screen">
      <div className="border-t relative bg-gradient-to-b from-gray-900 to-background lg:py-20 py-10 md:min-h-[80vh] flex items-center justify-center flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] w-full h-full from-gray-800/50 via-background/80 to-background pointer-events-none" />
        <ScriptGenerationClient
          isAuthenticated={!!session}
          heading={heading}
          suggestions={suggestions}
        />
      </div>
      <div className="flex justify-center items-center w-full relative">
        <ScriptKitDownload
          macIntelRelease={macIntel}
          macSiliconRelease={macSilicon}
          windowsx64Release={winx64}
          windowsarm64Release={winarm64}
          linuxx64Release={linuxx64}
          linuxarm64Release={linuxarm64}
          betaRelease={beta}
        />
        <div className="absolute z-0 inset-0">
          <SponsorBackground />
        </div>
      </div>
      <div className="mb-12 hidden">
        <Testimonials testimonials={testimonials} />
      </div>
      <ScrollToContent>
        <section id="scripts" className="border-t sm:py-16 py-8">
          <div className="w-full container mx-auto px-5">
            <ViewToggle />
          </div>
        </section>
      </ScrollToContent>
    </div>
  )
}
