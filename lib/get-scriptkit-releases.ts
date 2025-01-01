import { Octokit } from '@octokit/rest'
import { unstable_cache } from 'next/cache'

const octokit = new Octokit({
  auth: process.env.GITHUB_RELEASES_TOKEN,
})

type Asset = {
  name: string
  browser_download_url: string
}

export type ScriptKitRelease = {
  name: string
  browser_download_url: string
}

type GitHubRelease = {
  name: string | null
  prerelease: boolean
  html_url: string
  tag_name: string
  assets: Array<{
    name: string
    browser_download_url: string
  }>
}

// Step 1: Create a function to fetch releases without caching
async function fetchAllReleases() {
  const releaseResponses = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      octokit.repos.listReleases({
        owner: 'johnlindquist',
        repo: 'kitapp',
        per_page: 100,
        page: i + 1,
      })
    )
  )

  return releaseResponses.flatMap(response => response.data) as GitHubRelease[]
}

// Step 2: Create cached getters for each platform
const getCachedMacIntel = unstable_cache(
  async () => {
    const releases = await fetchAllReleases()
    const stableRelease = findStableRelease(releases)
    if (!stableRelease) return null

    const foundAsset = stableRelease.assets.find(
      (asset: Asset) =>
        !asset.name.includes('beta') &&
        !asset.name.includes('alpha') &&
        !asset.name.includes('arm') &&
        asset.name.endsWith('.dmg')
    )

    return foundAsset
      ? {
          name: foundAsset.name,
          browser_download_url: foundAsset.browser_download_url,
        }
      : null
  },
  ['mac-intel-release'],
  {
    revalidate: false,
    tags: ['mac-intel-release'],
  }
)

const getCachedMacSilicon = unstable_cache(
  async () => {
    const releases = await fetchAllReleases()
    const stableRelease = findStableRelease(releases)
    if (!stableRelease) return null

    const foundAsset = stableRelease.assets.find(
      (asset: Asset) =>
        !asset.name.includes('beta') &&
        !asset.name.includes('alpha') &&
        asset.name.includes('arm') &&
        asset.name.endsWith('.dmg')
    )

    return foundAsset
      ? {
          name: foundAsset.name,
          browser_download_url: foundAsset.browser_download_url,
        }
      : null
  },
  ['mac-silicon-release'],
  {
    revalidate: false,
    tags: ['mac-silicon-release'],
  }
)

const getCachedWindowsx64 = unstable_cache(
  async () => {
    const releases = await fetchAllReleases()
    const stableRelease = findStableRelease(releases)
    if (!stableRelease) return null

    const foundAsset = stableRelease.assets.find(
      (asset: Asset) =>
        !asset.name.includes('beta') &&
        !asset.name.includes('alpha') &&
        !asset.name.includes('arm') &&
        asset.name.endsWith('.exe')
    )

    return foundAsset
      ? {
          name: foundAsset.name,
          browser_download_url: foundAsset.browser_download_url,
        }
      : null
  },
  ['windows-x64-release'],
  {
    revalidate: false,
    tags: ['windows-x64-release'],
  }
)

const getCachedWindowsarm64 = unstable_cache(
  async () => {
    const releases = await fetchAllReleases()
    const stableRelease = findStableRelease(releases)
    if (!stableRelease) return null

    const foundAsset = stableRelease.assets.find(
      (asset: Asset) =>
        !asset.name.includes('beta') &&
        !asset.name.includes('alpha') &&
        asset.name.includes('arm') &&
        asset.name.endsWith('.exe')
    )

    return foundAsset
      ? {
          name: foundAsset.name,
          browser_download_url: foundAsset.browser_download_url,
        }
      : null
  },
  ['windows-arm64-release'],
  {
    revalidate: false,
    tags: ['windows-arm64-release'],
  }
)

const getCachedLinuxx64 = unstable_cache(
  async () => {
    const releases = await fetchAllReleases()
    const stableRelease = findStableRelease(releases)
    if (!stableRelease) return null

    const foundAsset = stableRelease.assets.find(
      (asset: Asset) =>
        !asset.name.includes('arm') &&
        !asset.name.includes('beta') &&
        !asset.name.includes('alpha') &&
        asset.name.endsWith('AppImage')
    )

    return foundAsset
      ? {
          name: foundAsset.name,
          browser_download_url: foundAsset.browser_download_url,
        }
      : null
  },
  ['linux-x64-release'],
  {
    revalidate: false,
    tags: ['linux-x64-release'],
  }
)

const getCachedLinuxarm64 = unstable_cache(
  async () => {
    const releases = await fetchAllReleases()
    const stableRelease = findStableRelease(releases)
    if (!stableRelease) return null

    const foundAsset = stableRelease.assets.find(
      (asset: Asset) =>
        asset.name.includes('arm') &&
        !asset.name.includes('beta') &&
        !asset.name.includes('alpha') &&
        asset.name.endsWith('AppImage')
    )

    return foundAsset
      ? {
          name: foundAsset.name,
          browser_download_url: foundAsset.browser_download_url,
        }
      : null
  },
  ['linux-arm64-release'],
  {
    revalidate: false,
    tags: ['linux-arm64-release'],
  }
)

const getCachedBetaRelease = unstable_cache(
  async () => {
    const releases = await fetchAllReleases()
    const betaRelease = releases.find(
      release =>
        release.prerelease ||
        release.name?.toLowerCase().includes('beta') ||
        release.name?.toLowerCase().includes('alpha')
    )

    if (betaRelease) {
      return {
        html_url: betaRelease.html_url,
        tag_name: betaRelease.tag_name,
      }
    }

    return null
  },
  ['beta-release'],
  {
    revalidate: false,
    tags: ['beta-release'],
  }
)

function findStableRelease(releases: GitHubRelease[]) {
  return releases.find(
    release =>
      !release?.name?.includes('beta') &&
      !release?.name?.includes('alpha') &&
      !release.prerelease &&
      release?.assets?.length > 0
  )
}

// Step 3: Update the export functions to use cached getters
export async function getMacIntelRelease(): Promise<ScriptKitRelease | null> {
  return getCachedMacIntel()
}

export async function getMacSiliconRelease(): Promise<ScriptKitRelease | null> {
  return getCachedMacSilicon()
}

export async function getWindowsx64Release(): Promise<ScriptKitRelease | null> {
  return getCachedWindowsx64()
}

export async function getWindowsarm64Release(): Promise<ScriptKitRelease | null> {
  return getCachedWindowsarm64()
}

export async function getLinuxx64Release(): Promise<ScriptKitRelease | null> {
  return getCachedLinuxx64()
}

export async function getLinuxarm64Release(): Promise<ScriptKitRelease | null> {
  return getCachedLinuxarm64()
}

export type BetaRelease = {
  html_url: string
  tag_name: string
}

export async function getBetaRelease(): Promise<BetaRelease | null> {
  return getCachedBetaRelease()
}
