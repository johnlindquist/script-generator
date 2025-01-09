import { config } from 'dotenv'
import { prisma } from '../lib/prisma'

// Load environment variables from .env file
config()

async function main() {
  const sponsorLogin = `test_sponsor_testSponsor`
  // Create/update the user with sponsor relationship
  const testUser = await prisma.user.upsert({
    where: { username: 'testSponsor' },
    update: {
      sponsorship: {
        upsert: {
          create: {
            login: sponsorLogin,
            nodeId: `TEST_SPONSOR_NODE_test-sponsor-id`,
            databaseId: Math.floor(Math.random() * 999999),
          },
          update: {},
        },
      },
    },
    create: {
      id: 'test-sponsor-id',
      username: 'testSponsor',
      fullName: 'Test Sponsor',
      sponsorship: {
        create: {
          login: sponsorLogin,
          nodeId: `TEST_SPONSOR_NODE_test-sponsor-id`,
          databaseId: Math.floor(Math.random() * 999999),
        },
      },
    },
  })

  console.log('Test sponsor has been set up:', testUser)
}

main()
  .catch(error => {
    console.error('Error setting up test sponsor:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
