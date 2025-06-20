declare module '@prisma/client' {
  // Basic models extracted from prisma/schema.prisma used in the frontend layer.
  export interface User {
    id: string
    username: string
    fullName: string | null
    // Relations used in the app
    favorites?: unknown[]
    installs?: unknown[]
    verifications?: unknown[]
    scripts?: Script[]
    requestedBy?: Script[]
    usage?: unknown[]
    sponsorship?: unknown
  }

  export interface ScriptCount {
    verifications: number
    favorites: number
    installs: number
  }

  export interface Script {
    id: string
    title: string
    content: string
    ownerId: string
    dashedName?: string
    locked: boolean
    owner?: User
    _count?: ScriptCount
  }

  export namespace Prisma {
    export type UserGetPayload<T> = User
    export type ScriptGetPayload<T> = Script
  }

  export class PrismaClient {
    user: {
      findUnique: (args: unknown) => Promise<User | null>
    }
    script: {
      findFirst: (args: unknown) => Promise<Script | null>
    }
  }
}