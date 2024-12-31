import { prisma } from '../lib/prisma'

async function resetMyUsage() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  await prisma.usage.deleteMany({
    where: {
      date: now,
    },
  })

  console.log("Successfully reset today's usage count")
}

resetMyUsage()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
