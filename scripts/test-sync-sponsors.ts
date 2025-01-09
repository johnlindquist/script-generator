import { prisma } from '../lib/prisma'

async function testSyncSponsors() {
  try {
    console.log('Testing sync-sponsors route...')

    // Get initial count of sponsors
    const initialCount = await prisma.githubSponsor.count()
    console.log('Initial sponsor count:', initialCount)

    // Make request to the sync-sponsors route
    const response = await fetch('http://localhost:3000/api/cron/sync-sponsors')

    if (!response.ok) {
      throw new Error(`Failed to sync sponsors: ${response.status} ${response.statusText}`)
    }

    // Get final count of sponsors
    const finalCount = await prisma.githubSponsor.count()
    console.log('Final sponsor count:', finalCount)
    console.log('Difference:', finalCount - initialCount)

    console.log('Sync sponsors test completed successfully')
  } catch (error) {
    console.error('Error testing sync-sponsors:', error)
  }
}

testSyncSponsors()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
