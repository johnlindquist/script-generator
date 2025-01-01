import { Prisma } from '@prisma/client'

// Base Prisma types for different query shapes
export type ScriptWithAllRelations = Prisma.ScriptGetPayload<{
  include: {
    owner: true
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
}>

export type ScriptWithMinimalRelations = Prisma.ScriptGetPayload<{
  include: {
    owner: true
    _count: {
      select: {
        verifications: true
        favorites: true
        installs: true
      }
    }
  }
}>

// Runtime computed fields that get added to Prisma results
export interface ScriptComputedFields {
  isVerified: boolean
  isFavorited: boolean
}

// Types for different views after computing fields
export type ScriptWithComputedFields = ScriptWithMinimalRelations & ScriptComputedFields

export type ScriptWithAllComputedFields = ScriptWithAllRelations & ScriptComputedFields

// Response types for different views
export interface ScriptsResponse {
  scripts: ScriptWithComputedFields[]
  totalPages: number
  currentPage: number
}

export interface ScriptDetailResponse {
  script: ScriptWithAllComputedFields
}

// Utility type for creating new scripts
export type ScriptCreateInput = Prisma.ScriptCreateInput
