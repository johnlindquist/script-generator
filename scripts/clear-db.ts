import { PrismaClient } from '@prisma/client'

async function clearDatabase() {
  const prisma = new PrismaClient()

  try {
    // Delete in order of dependencies
    console.log('Clearing database...')

    // First, clear tables with no dependencies
    await prisma.like.deleteMany()
    await prisma.install.deleteMany()
    await prisma.usage.deleteMany()
    await prisma.scriptVersion.deleteMany()

    // Clear main tables
    await prisma.tag.deleteMany()
    await prisma.script.deleteMany()
    await prisma.sponsor.deleteMany()
    await prisma.user.deleteMany()

    console.log('Database cleared successfully!')
  } catch (error) {
    console.error('Error clearing database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearDatabase()
