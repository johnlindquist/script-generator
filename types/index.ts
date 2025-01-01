// Export our computed/extended types
export * from './user'
export * from './script'

// Re-export ALL Prisma types as the source of truth
export type {
  Prisma,
  User,
  Script,
  ScriptStatus,
  Favorite,
  Install,
  Verification,
  Tag,
  Sponsor,
  Usage,
} from '@prisma/client'
