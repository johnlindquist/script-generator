import { Octokit } from '@octokit/rest'

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
async function fetchAllReleases(): Promise<GitHubRelease[]> {
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

function findStableRelease(releases: GitHubRelease[]) {
  return releases.find(
    release =>
      !release?.name?.includes('beta') &&
      !release?.name?.includes('alpha') &&
      !release.prerelease &&
      release?.assets?.length > 0
  )
}

// Step 2: Modify direct async functions to accept releases data
export function getMacIntelRelease(allReleases: GitHubRelease[]): ScriptKitRelease | null {
  const stableRelease = findStableRelease(allReleases)
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
}

export function getMacSiliconRelease(allReleases: GitHubRelease[]): ScriptKitRelease | null {
  const stableRelease = findStableRelease(allReleases)
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
}

export function getWindowsx64Release(allReleases: GitHubRelease[]): ScriptKitRelease | null {
  const stableRelease = findStableRelease(allReleases)
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
}

export function getWindowsarm64Release(allReleases: GitHubRelease[]): ScriptKitRelease | null {
  const stableRelease = findStableRelease(allReleases)
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
}

export function getLinuxx64Release(allReleases: GitHubRelease[]): ScriptKitRelease | null {
  const stableRelease = findStableRelease(allReleases)
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
}

export function getLinuxarm64Release(allReleases: GitHubRelease[]): ScriptKitRelease | null {
  const stableRelease = findStableRelease(allReleases)
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
}

export type BetaRelease = {
  html_url: string
  tag_name: string
}

export function getBetaRelease(allReleases: GitHubRelease[]): BetaRelease | null {
  // Find the index of the latest stable release
  const stableReleaseIndex = allReleases.findIndex(
    release =>
      !release?.name?.includes('beta') &&
      !release?.name?.includes('alpha') &&
      !release.prerelease &&
      release?.assets?.length > 0
  )

  // Find the beta release
  const betaReleaseIndex = allReleases.findIndex(
    release =>
      release.prerelease ||
      release.name?.toLowerCase().includes('beta') ||
      release.name?.toLowerCase().includes('alpha')
  )

  // Only return beta if it exists and comes before (is newer than) the stable release
  if (
    betaReleaseIndex !== -1 &&
    (stableReleaseIndex === -1 || betaReleaseIndex < stableReleaseIndex)
  ) {
    const betaReleaseData = allReleases[betaReleaseIndex]
    return {
      html_url: betaReleaseData.html_url,
      tag_name: betaReleaseData.tag_name,
    }
  }

  return null
}

export interface AllReleasesData {
  macIntel: ScriptKitRelease | null
  macSilicon: ScriptKitRelease | null
  winx64: ScriptKitRelease | null
  winarm64: ScriptKitRelease | null
  linuxx64: ScriptKitRelease | null
  linuxarm64: ScriptKitRelease | null
  beta: BetaRelease | null
}

export async function getAllScriptKitReleases(): Promise<AllReleasesData> {
  const allGitHubReleases = await fetchAllReleases()

  // Call sync functions with the fetched data
  const macIntel = getMacIntelRelease(allGitHubReleases)
  const macSilicon = getMacSiliconRelease(allGitHubReleases)
  const winx64 = getWindowsx64Release(allGitHubReleases)
  const winarm64 = getWindowsarm64Release(allGitHubReleases)
  const linuxx64 = getLinuxx64Release(allGitHubReleases)
  const linuxarm64 = getLinuxarm64Release(allGitHubReleases)
  const beta = getBetaRelease(allGitHubReleases)

  return {
    macIntel,
    macSilicon,
    winx64,
    winarm64,
    linuxx64,
    linuxarm64,
    beta,
  }
}
