import { Octokit } from '@octokit/rest'

const octokit = new Octokit()

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

let releases: GitHubRelease[] = []

async function fetchAllReleases() {
  if (releases.length) return releases

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

  releases = releaseResponses.flatMap(response => response.data)
  return releases
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

export async function getMacIntelRelease(): Promise<ScriptKitRelease | null> {
  const allReleases = await fetchAllReleases()
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

export async function getMacSiliconRelease(): Promise<ScriptKitRelease | null> {
  const allReleases = await fetchAllReleases()
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

export async function getWindowsx64Release(): Promise<ScriptKitRelease | null> {
  const allReleases = await fetchAllReleases()
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

export async function getWindowsarm64Release(): Promise<ScriptKitRelease | null> {
  const allReleases = await fetchAllReleases()
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

export async function getLinuxx64Release(): Promise<ScriptKitRelease | null> {
  const allReleases = await fetchAllReleases()
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

export async function getLinuxarm64Release(): Promise<ScriptKitRelease | null> {
  const allReleases = await fetchAllReleases()
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

export async function getBetaRelease(): Promise<BetaRelease | null> {
  const allReleases = await fetchAllReleases()
  console.log(
    'All releases:',
    allReleases.map(r => ({
      name: r.name,
      prerelease: r.prerelease,
      html_url: r.html_url,
      tag_name: r.tag_name,
    }))
  )

  const betaRelease = allReleases.find(release => {
    const isBeta =
      release.prerelease ||
      release?.name?.toLowerCase().includes('beta') ||
      release?.name?.toLowerCase().includes('alpha')

    if (isBeta) {
      console.log('Found beta release:', {
        name: release.name,
        prerelease: release.prerelease,
        html_url: release.html_url,
        tag_name: release.tag_name,
      })
    }

    return isBeta
  })

  return betaRelease
    ? {
        html_url: betaRelease.html_url,
        tag_name: betaRelease.tag_name,
      }
    : null
}
