import { Prisma } from '@prisma/client'

export type ScriptWithRelations = Prisma.ScriptGetPayload<{
  include: {
    owner: {
      select: {
        username: true
        id: true
        fullName: true
      }
    }
    _count: {
      select: {
        verifications: true
        favorites: true
        installs: true
      }
    }
  }
}> & {
  isVerified: boolean
  isFavorited: boolean
  owner: {
    id: string
    username: string
    fullName: string | null
  }
  _count: {
    verifications: number
    favorites: number
    installs: number
  }
}

export interface ScriptsResponse {
  scripts: ScriptWithRelations[]
  totalPages: number
  currentPage: number
}
