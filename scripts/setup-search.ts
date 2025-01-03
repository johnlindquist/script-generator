import { config } from 'dotenv'
import { execSync } from 'child_process'
import { join } from 'path'

// Load environment variables from .env file
config()

const connectionString = process.env.NEON_POSTGRES_POSTGRES_URL_NON_POOLING

if (!connectionString) {
  console.error('Missing NEON_POSTGRES_POSTGRES_URL_NON_POOLING in .env')
  process.exit(1)
}

try {
  const scriptPath = join(__dirname, 'setup-search-index.sql')
  execSync(`psql "${connectionString}" -f "${scriptPath}"`, { stdio: 'inherit' })
  console.log('✅ Search index setup complete')
} catch (error) {
  console.error('❌ Error setting up search index:', error)
  process.exit(1)
}
