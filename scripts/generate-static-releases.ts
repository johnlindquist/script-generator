import fs from 'fs'
import path from 'path'
import { getAllScriptKitReleases, AllReleasesData } from '../lib/get-scriptkit-releases'

async function generateReleasesFile(): Promise<void> {
  console.log('Generating static releases.json...')
  try {
    const releasesData: AllReleasesData = await getAllScriptKitReleases()
    const filePath = path.join(process.cwd(), 'public', 'releases.json')

    // Ensure the public directory exists
    fs.mkdirSync(path.join(process.cwd(), 'public'), { recursive: true })

    fs.writeFileSync(filePath, JSON.stringify(releasesData, null, 2))
    console.log(`Successfully wrote releases data to ${filePath}`)
  } catch (error) {
    console.error('Failed to generate static releases.json:', error)
    // Optionally, re-throw the error to fail the build if this data is critical
    // throw error;
    process.exit(1) // Exit with error to fail the build
  }
}

generateReleasesFile()
