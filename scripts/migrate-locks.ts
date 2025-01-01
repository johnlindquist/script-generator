import { prisma } from '@/lib/prisma'

async function main() {
  // First update the schema to include locked field
  const scripts = await prisma.script.findMany({
    where: {
      OR: [
        { favorites: { some: {} } },
        { verifications: { some: {} } },
        { installs: { some: {} } },
      ],
      locked: false,
    },
    select: {
      id: true,
      ownerId: true,
      favorites: {
        where: {
          userId: {
            not: undefined,
          },
        },
        select: { userId: true },
      },
      verifications: {
        select: { userId: true },
      },
      installs: {
        where: {
          userId: {
            not: null,
          },
        },
        select: { userId: true },
      },
    },
  })

  console.log(`Found ${scripts.length} scripts to check`)

  for (const script of scripts) {
    const nonOwnerInteractions = [
      ...script.favorites,
      ...script.verifications,
      ...script.installs,
    ].filter(interaction => interaction.userId !== script.ownerId)

    if (nonOwnerInteractions.length > 0) {
      console.log(
        `Locking script ${script.id} - has ${nonOwnerInteractions.length} non-owner interactions`
      )
      await prisma.script.update({
        where: { id: script.id },
        data: { locked: true },
      })
    }
  }

  console.log('Migration complete')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
