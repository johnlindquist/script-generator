import { prisma } from './prisma'

export async function shouldLockScript(scriptId: string): Promise<boolean> {
  const script = await prisma.script.findUnique({
    where: { id: scriptId },
    select: { ownerId: true },
  })
  if (!script) return false

  const { ownerId } = script

  console.log('shouldLockScript Debug - Script:', {
    scriptId,
    ownerId,
  })

  const favoriteCount = await prisma.favorite.count({
    where: { scriptId, userId: { not: ownerId } },
  })

  const verificationCount = await prisma.verification.count({
    where: { scriptId, userId: { not: ownerId } },
  })

  const installCount = await prisma.install.count({
    where: {
      scriptId,
      AND: [{ userId: { not: ownerId } }, { userId: { not: null } }],
    },
  })

  console.log('shouldLockScript Debug - Counts:', {
    scriptId,
    favoriteCount,
    verificationCount,
    installCount,
  })

  const shouldLock = favoriteCount + verificationCount + installCount > 0
  console.log('shouldLockScript Debug - Result:', {
    scriptId,
    shouldLock,
  })

  return shouldLock
}
