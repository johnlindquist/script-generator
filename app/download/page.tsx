import ScriptKitDownload from '@/components/ScriptKitDownload'
// We no longer need individual getters here
/*
import {
  getMacIntelRelease,
  getMacSiliconRelease,
  getWindowsx64Release,
  getWindowsarm64Release,
  getLinuxx64Release,
  getLinuxarm64Release,
  getBetaRelease,
} from '@/lib/get-scriptkit-releases'
*/
import { getStaticReleaseData, initialReleaseData } from '@/lib/static-data-fetchers'
import { type AllReleasesData } from '@/lib/get-scriptkit-releases' // Still need the type

// This page is completely static and will only update on new deployments
export const dynamic = 'force-static'

export default async function DownloadPage() {
  // Fetch the consolidated static data
  const releases: AllReleasesData = (await getStaticReleaseData()) || initialReleaseData

  return (
    <main className="mx-auto max-w-3xl py-10">
      <h1 className="mb-8 text-center text-4xl font-bold">Download Script Kit</h1>
      <ScriptKitDownload
        macIntelRelease={releases.macIntel}
        macSiliconRelease={releases.macSilicon}
        windowsx64Release={releases.winx64}
        windowsarm64Release={releases.winarm64}
        linuxx64Release={releases.linuxx64}
        linuxarm64Release={releases.linuxarm64}
        betaRelease={releases.beta}
      />
    </main>
  )
}
