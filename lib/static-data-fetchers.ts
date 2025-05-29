import fs from 'fs'
import path from 'path'
import { type AllReleasesData } from './get-scriptkit-releases'
// safeFetch is primarily for client-side fallback or other HTTP requests now.
// import { safeFetch } from './safe-fetch';

export const initialReleaseData: AllReleasesData = {
  macIntel: null,
  macSilicon: null,
  winx64: null,
  winarm64: null,
  linuxx64: null,
  linuxarm64: null,
  beta: null,
}

export async function getStaticReleaseData(): Promise<AllReleasesData> {
  if (typeof window === 'undefined') {
    // Server-side: Read directly from the filesystem
    try {
      const filePath = path.join(process.cwd(), 'public', 'releases.json')
      // Check if the file exists. This is important because during the very first build phase,
      // the script to generate this file might not have completed for all page generations if not carefully sequenced.
      // However, our build script (`tsx scripts/... && next build`) should ensure it exists before page building starts.
      if (fs.existsSync(filePath)) {
        const fileContents = fs.readFileSync(filePath, 'utf-8')
        const data = JSON.parse(fileContents)
        return data as AllReleasesData
      } else {
        console.warn(
          `Static releases.json not found at ${filePath} during server-side read. Using initial data.`
        )
        return initialReleaseData
      }
    } catch (error) {
      console.error('Error reading static releases.json from filesystem:', error)
      return initialReleaseData
    }
  } else {
    // Client-side: Fallback to HTTP fetch.
    // This path should ideally not be taken if getStaticReleaseData is only called from Server Components.
    // If Vercel authentication is on, this fetch will also likely fail with 401 if the user isn't authenticated with Vercel.
    console.warn(
      'getStaticReleaseData called on client-side. Attempting fetch /releases.json. This might fail due to Vercel auth.'
    )

    // For client-side fetch of a public file, a relative URL is standard.
    const staticReleasesUrl = '/releases.json'
    try {
      const response = await fetch(staticReleasesUrl) // Using browser's native fetch
      if (!response.ok) {
        const errorBody = await response.text() // Get more info on the error
        console.error(
          `Client-side fetch for ${staticReleasesUrl} failed: ${response.status} ${response.statusText}`,
          { errorBody }
        )
        return initialReleaseData
      }
      const data = await response.json()
      return data as AllReleasesData
    } catch (error) {
      console.error('Error fetching static releases.json on client-side:', error)
      return initialReleaseData
    }
  }
}
