import { Prisma, User } from '@prisma/client'

// Use Prisma's generated types for all base user operations
export type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    scripts: true
    favorites: true
    verifications: true
    installs: true
    usage: true
  }
}>

// Runtime-only properties that don't exist in the database
export type UserWithComputedFields = User & {
  isAdmin?: boolean
}
