import ScriptKitDownload from '@/components/ScriptKitDownload'
import {
  getMacIntelRelease,
  getMacSiliconRelease,
  getWindowsx64Release,
  getWindowsarm64Release,
  getLinuxx64Release,
  getLinuxarm64Release,
} from '@/lib/get-scriptkit-releases'

// This page is completely static and will only update on new deployments
export const dynamic = 'force-static'

export default async function DownloadPage() {
  const [macIntel, macSilicon, winx64, winarm64, linuxx64, linuxarm64] = await Promise.all([
    getMacIntelRelease(),
    getMacSiliconRelease(),
    getWindowsx64Release(),
    getWindowsarm64Release(),
    getLinuxx64Release(),
    getLinuxarm64Release(),
  ])

  return (
    <main className="mx-auto max-w-3xl py-10">
      <h1 className="mb-8 text-center text-4xl font-bold">Download Script Kit</h1>
      <ScriptKitDownload
        macIntelRelease={macIntel}
        macSiliconRelease={macSilicon}
        windowsx64Release={winx64}
        windowsarm64Release={winarm64}
        linuxx64Release={linuxx64}
        linuxarm64Release={linuxarm64}
      />
    </main>
  )
}
