import { prisma } from '../lib/prisma'

async function clearScripts() {
  try {
    // Delete all script versions first due to foreign key constraints
    await prisma.scriptVersion.deleteMany({})
    console.log('✓ Cleared all script versions')

    // Delete all scripts
    await prisma.script.deleteMany({})
    console.log('✓ Cleared all scripts')

    console.log('Successfully cleared all scripts from the database')
  } catch (error) {
    console.error('Error clearing scripts:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearScripts()
