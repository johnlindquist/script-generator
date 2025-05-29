import { getServerSession } from 'next-auth'
import { authOptions } from './api/auth/[...nextauth]/route'
import ReactMarkdown from 'react-markdown'
import ScriptGenerationClient from '@/components/ScriptGenerationClient'
import ViewToggle from '@/components/ViewToggle'
import ScriptKitDownload from '@/components/ScriptKitDownload'
import SponsorBackground from '@/components/SponsorBackground'
import Testimonials from '@/components/Testimonials'
import { getRandomHeading } from '@/lib/getRandomHeading'
import { getTestimonials } from '@/lib/get-testimonials'
import React from 'react'
import ScrollToContent from '@/components/ScrollToContent'
import Image from 'next/image'
import { type AllReleasesData } from '@/lib/get-scriptkit-releases'
import { getStaticReleaseData, initialReleaseData } from '@/lib/static-data-fetchers'

export default async function Home() {
  const session = await getServerSession(authOptions)
  const heading = getRandomHeading()
  const testimonials = getTestimonials()

  const releases: AllReleasesData = (await getStaticReleaseData()) || initialReleaseData

  return (
    <div id="layout" className="relative min-h-screen">
      <div className="border-t relative bg-gradient-to-b from-gray-900 to-background lg:py-20 py-10 md:min-h-[80vh] flex items-center justify-center flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] w-full h-full from-gray-800/50 via-background/80 to-background pointer-events-none" />
        <ScriptGenerationClient isAuthenticated={!!session} heading={heading} />
      </div>
      <div className="flex justify-center items-center w-full relative bg-gray-950 border-t lg:py-16 py-8">
        <div className="container grid lg:grid-cols-2 grid-cols-1 gap-5 lg:gap-10 mx-auto px-5">
          <div className="relative rounded border border-white/5 overflow-hidden flex items-center justify-center lg:p-10 xl:p-16 p-2 min-w-full">
            <Image
              src="/assets/desktop_cropped.png"
              alt="desktop"
              className="object-cover"
              quality={100}
              fill
            />
            <div className="absolute left-0 top-0 h-6 px-2 bg-gray-950 p-1 w-full flex items-center gap-1">
              <div className="bg-red-400 w-2 h-2 rounded-full" />
              <div className="bg-yellow-400 w-2 h-2 rounded-full" />
              <div className="bg-green-400 w-2 h-2 rounded-full" />
            </div>
          </div>
          <article className="prose prose-lg prose-invert py-8 px-2">
            <ReactMarkdown>{`
# What is Script Kit?

### An open-source, cross-platform, desktop app for creating and running scripts!

How often do you avoid scripting something because it takes too much effort?

Script Kit makes it easy to create and run scripts that solve your daily problems.
Create a new script from the prompt then your script opens in the editor of your choice. 
Write a few lines of JavaScript. Then run the script from the prompt.

Simply put, Script Kit helps you script away the friction of your day.

### Key Features

- Launch scripts from anywhere
- Friendly TypeScript SDK with built-in UIs and helpers
- [Documentation](https://johnlindquist.github.io/kit-docs/)
- [Script Kit GitHub Discussions](https://github.com/johnlindquist/kit/discussions)
            `}</ReactMarkdown>
          </article>
        </div>
      </div>
      <div className="flex justify-center items-center w-full relative">
        <ScriptKitDownload
          macIntelRelease={releases.macIntel}
          macSiliconRelease={releases.macSilicon}
          windowsx64Release={releases.winx64}
          windowsarm64Release={releases.winarm64}
          linuxx64Release={releases.linuxx64}
          linuxarm64Release={releases.linuxarm64}
          betaRelease={releases.beta}
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
