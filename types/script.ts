import { Prisma } from '@prisma/client'

/**
 * Runtime computed fields that get added to Prisma results
 */
export interface ScriptComputedFields {
  isVerified: boolean
  isFavorited: boolean
}

/**
 * A "lite" script payload for list views and grids.
 * Includes owner, counts, and computed fields.
 */
export type ScriptLite = Prisma.ScriptGetPayload<{
  include: {
    owner: {
      include: {
        sponsorship: true
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
}> &
  ScriptComputedFields

/**
 * A "full" script payload for detailed views.
 * Includes all relations like verifications, favorites, tags, etc.
 */
export type ScriptFull = Prisma.ScriptGetPayload<{
  include: {
    owner: {
      include: {
        sponsorship: true
      }
    }
    verifications: true
    favorites: true
    installs: true
    tags: true
    sponsor: true
    _count: {
      select: {
        verifications: true
        favorites: true
        installs: true
      }
    }
  }
}> &
  ScriptComputedFields

/**
 * Response type for paginated script lists
 */
export interface ScriptsResponse {
  scripts: ScriptLite[]
  totalPages: number
  currentPage: number
}

/**
 * Response type for detailed script view
 */
export interface ScriptDetailResponse {
  script: ScriptFull
}

/**
 * Utility type for creating new scripts
 */
export type ScriptCreateInput = Prisma.ScriptCreateInput

// Type aliases for backward compatibility
export type ScriptWithMinimalRelations = Omit<ScriptLite, keyof ScriptComputedFields>
export type ScriptWithAllRelations = Omit<ScriptFull, keyof ScriptComputedFields>
export type ScriptWithComputedFields = ScriptLite
export type ScriptWithAllComputedFields = ScriptFull
