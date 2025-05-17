import * as fs from 'fs'
import * as path from 'path'
import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import * as util from 'util'

const execPromise = util.promisify(exec)
const prisma = new PrismaClient()

async function main() {
  const backupDir = path.join(process.cwd(), 'database-backups')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupFile = path.join(backupDir, `script_generator_backup_${timestamp}.json`)

  console.log('Creating database backup directory...')
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  console.log('Fetching data from database...')

  // Fetch all data from the database
  const scripts = await prisma.script.findMany()
  console.log(`- Fetched ${scripts.length} scripts`)

  const scriptVersions = await prisma.scriptVersion.findMany()
  console.log(`- Fetched ${scriptVersions.length} script versions`)

  const users = await prisma.user.findMany()
  console.log(`- Fetched ${users.length} users`)

  const favorites = await prisma.favorite.findMany()
  console.log(`- Fetched ${favorites.length} favorites`)

  const installs = await prisma.install.findMany()
  console.log(`- Fetched ${installs.length} installs`)

  const verifications = await prisma.verification.findMany()
  console.log(`- Fetched ${verifications.length} verifications`)

  const tags = await prisma.tag.findMany()
  console.log(`- Fetched ${tags.length} tags`)

  const sponsors = await prisma.sponsor.findMany()
  console.log(`- Fetched ${sponsors.length} sponsors`)

  const usages = await prisma.usage.findMany()
  console.log(`- Fetched ${usages.length} usage records`)

  const githubSponsors = await prisma.githubSponsor.findMany()
  console.log(`- Fetched ${githubSponsors.length} GitHub sponsors`)

  // Prepare backup data object
  const backupData = {
    scripts,
    scriptVersions,
    users,
    favorites,
    installs,
    verifications,
    tags,
    sponsors,
    usages,
    githubSponsors,
    metadata: {
      createdAt: new Date().toISOString(),
      version: '1.0.0',
    },
  }

  // Write to file
  console.log(`Writing backup to ${backupFile}...`)
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2))
  console.log(`✅ Backup file created: ${backupFile}`)

  // Compress the file using gzip
  console.log('Compressing backup file...')
  try {
    await execPromise(`gzip -c "${backupFile}" > "${backupFile}.gz"`)

    // Get file sizes
    const originalSize = fs.statSync(backupFile).size
    const compressedSize = fs.statSync(`${backupFile}.gz`).size

    console.log(`✅ Compressed backup created: ${backupFile}.gz`)
    console.log(`Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`Compressed size: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`)
  } catch (error) {
    console.error('❌ Failed to compress backup file:', error)
  }

  console.log('Backup completed successfully!')
}

main()
  .catch(e => {
    console.error('Error creating backup:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
