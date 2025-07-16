import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupDuplicates() {
  // Find duplicate groups
  const duplicateGroups = (await prisma.$queryRaw`
    SELECT title, "ownerId", COUNT(*)
    FROM "Script"
    WHERE status = 'ACTIVE' AND saved = true
    GROUP BY title, "ownerId"
    HAVING COUNT(*) > 1;
  `) as { title: string; ownerId: string; count: bigint }[]

  console.log(`Found ${duplicateGroups.length} duplicate groups`)

  for (const group of duplicateGroups) {
    const { title, ownerId } = group

    // Fetch all scripts in this group, ordered by createdAt descending (newest first)
    const scripts = await prisma.script.findMany({
      where: {
        title,
        ownerId,
        status: 'ACTIVE',
        saved: true,
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true },
    })

    if (scripts.length < 2) continue

    // Keep the newest (first in the list), delete the rest
    const toKeep = scripts[0]
    const toDelete = scripts.slice(1)

    console.log(`Group: Title='${title}', Owner='${ownerId}'`)
    console.log(`  Keeping: ID=${toKeep.id}, Created=${toKeep.createdAt}`)
    await prisma.$transaction(async tx => {
      for (const script of toDelete) {
        // Delete related records
        await tx.favorite.deleteMany({ where: { scriptId: script.id } })
        await tx.install.deleteMany({ where: { scriptId: script.id } })
        await tx.verification.deleteMany({ where: { scriptId: script.id } })
        await tx.scriptVersion.deleteMany({ where: { scriptId: script.id } })
        // Assuming no children or handling separately; if children exist, may need to reparent
        await tx.script.delete({ where: { id: script.id } })
        console.log(`  Deleted: ID=${script.id}, Created=${script.createdAt}`)
      }
    })
  }

  await prisma.$disconnect()
  console.log('Cleanup complete')
}

cleanupDuplicates().catch(console.error)
