import { prisma } from '../lib/prisma'

async function main() {
  console.log('Clearing database...')

  await prisma.scriptVersion.deleteMany()
  await prisma.install.deleteMany()
  await prisma.verification.deleteMany()
  await prisma.favorite.deleteMany()
  await prisma.script.deleteMany()
  await prisma.user.deleteMany()
  await prisma.sponsor.deleteMany()
  await prisma.tag.deleteMany()

  console.log('Database cleared')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
