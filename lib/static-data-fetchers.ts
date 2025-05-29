import { type AllReleasesData } from './get-scriptkit-releases'
import { safeFetch } from './safe-fetch'

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
  let baseUrl = ''
  if (process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`
  } else if (process.env.NEXT_PUBLIC_APP_URL) {
    baseUrl = process.env.NEXT_PUBLIC_APP_URL
  } else if (process.env.NODE_ENV === 'development') {
    baseUrl = 'http://localhost:3000' // Assuming dev server runs on 3000
  }

  const staticReleasesUrl = `${baseUrl}/releases.json`

  try {
    const data = await safeFetch(staticReleasesUrl)
    if (data) {
      return data as AllReleasesData
    }
    console.warn('Could not fetch static releases.json, using initial data.')
    return initialReleaseData
  } catch (error) {
    console.error('Error fetching static releases.json:', error)
    return initialReleaseData
  }
}
