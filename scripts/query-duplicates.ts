import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function findDuplicates() {
  // Query for duplicates by title and owner
  const duplicatesByTitle = await prisma.$queryRaw`
    SELECT title, "ownerId", COUNT(*)
    FROM "Script"
    WHERE status = 'ACTIVE' AND saved = true
    GROUP BY title, "ownerId"
    HAVING COUNT(*) > 1;
  `

  console.log('Duplicates by title and owner:')
  console.log(duplicatesByTitle)

  // Query for exact duplicates by title, owner, and content
  const exactDuplicates = await prisma.$queryRaw`
    SELECT title, "ownerId", content, COUNT(*)
    FROM "Script"
    WHERE status = 'ACTIVE' AND saved = true
    GROUP BY title, "ownerId", content
    HAVING COUNT(*) > 1;
  `

  console.log('\nExact duplicates by title, owner, and content:')
  console.log(exactDuplicates)

  await prisma.$disconnect()
}

findDuplicates().catch(console.error)
