import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'
import { getSponsors } from '../lib/get-sponsors'

// Load environment variables from .env file
config()

async function main() {
  const sponsors = await getSponsors()
  const outputPath = path.join(process.cwd(), 'public', 'static-sponsors.json')
  fs.writeFileSync(outputPath, JSON.stringify(sponsors, null, 2))
  console.log('Sponsors have been written to static-sponsors.json')
}

main().catch(error => {
  console.error('Error fetching sponsors:', error)
  process.exit(1)
})
