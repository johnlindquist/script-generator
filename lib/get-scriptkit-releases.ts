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

function findStableRelease(releases: GitHubRelease[]) {
  return releases.find(
    release =>
      !release?.name?.includes('beta') &&
      !release?.name?.includes('alpha') &&
      !release.prerelease &&
      release?.assets?.length > 0
  )
}

// Step 2: Direct async functions for each platform (no caching)
export async function getMacIntelRelease(): Promise<ScriptKitRelease | null> {
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
}

export async function getMacSiliconRelease(): Promise<ScriptKitRelease | null> {
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
}

export async function getWindowsx64Release(): Promise<ScriptKitRelease | null> {
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
}

export async function getWindowsarm64Release(): Promise<ScriptKitRelease | null> {
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
}

export async function getLinuxx64Release(): Promise<ScriptKitRelease | null> {
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
}

export async function getLinuxarm64Release(): Promise<ScriptKitRelease | null> {
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
}

export type BetaRelease = {
  html_url: string
  tag_name: string
}

export async function getBetaRelease(): Promise<BetaRelease | null> {
  const releases = await fetchAllReleases()
  const betaReleaseData = releases.find(
    release =>
      release.prerelease ||
      release.name?.toLowerCase().includes('beta') ||
      release.name?.toLowerCase().includes('alpha')
  )

  if (betaReleaseData) {
    return {
      html_url: betaReleaseData.html_url,
      tag_name: betaReleaseData.tag_name,
    }
  }

  return null
}
