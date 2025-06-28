import { z } from 'zod'

// Common schemas
export const ScriptIdSchema = z.string().min(1)
export const UserIdSchema = z.string().min(1)

// Generate AI Gateway
export const GenerateRequestSchema = z.object({
    prompt: z.string().min(1),
    luckyRequestId: z.string().nullable().optional(),
    extractReasoning: z.boolean().optional(),
})

// Script creation/update
export const ScriptUpdateSchema = z.object({
    saved: z.boolean().optional(),
    content: z.string().optional(),
    title: z.string().optional(),
})

// Favorite/Star actions
export const FavoriteRequestSchema = z.object({
    scriptId: z.string().min(1),
})

export const StarRequestSchema = z.object({
    scriptId: z.string().min(1),
})

// Verify script
export const VerifyRequestSchema = z.object({
    scriptId: z.string().min(1),
})

// Install script
export const InstallRequestSchema = z.object({
    scriptId: z.string().min(1),
})

// Log interaction
export const LogInteractionSchema = z.object({
    interactionTimestamp: z.string(),
    logEntry: z.object({
        level: z.string(),
        category: z.string(),
        message: z.string(),
        data: z.record(z.unknown()).optional(),
    }),
})

// Mock generate draft
export const MockGenerateDraftSchema = z.object({
    prompt: z.string().min(1),
})

// Next suggestions
export const NextSuggestionsSchema = z.object({
    prompt: z.string().optional(),
    code: z.string().optional(),
    saved: z.boolean().optional(),
    breadcrumb: z.string().optional(),
    sessionInteractionId: z.string().optional(),
    currentStep: z.number().optional(),
    maxDepth: z.number().optional(),
})

// Sync repo
export const SyncRepoSchema = z.object({
    repoUrl: z.string().url(),
})

// Test AI Gateway
export const TestAIGatewaySchema = z.object({
    prompt: z.string().min(1),
})

// Usage tracking
export const TrackUsageSchema = z.object({
    event: z.string(),
    properties: z.record(z.unknown()),
    device: z.object({
        device_id: z.string(),
    }),
})

// GitHub user schema for imports
export const GitHubUserSchema = z.object({
    id: z.number(),
    login: z.string(),
    node_id: z.string(),
    twitter_username: z.string().nullable(),
    email: z.string().nullable(),
    name: z.string().nullable(),
    feature: z.string().optional(),
})

// Sponsor check schema
export const SponsorUserSchema = z.object({
    data: GitHubUserSchema,
})

// Scripts response schema
export const ScriptsResponseSchema = z.object({
    scripts: z.array(z.object({
        id: z.string(),
        title: z.string(),
        content: z.string(),
        summary: z.string().optional(),
        createdAt: z.string(),
        updatedAt: z.string(),
        ownerId: z.string(),
        // Add other script fields as needed
    })),
    totalCount: z.number(),
    hasMore: z.boolean(),
})

// Usage response schema
export const UsageResponseSchema = z.object({
    count: z.number(),
    limit: z.number(),
    remaining: z.number(),
})

// Suggestions response schema
export const SuggestionsResponseSchema = z.object({
    suggestions: z.array(z.string()),
})

export type ScriptsResponse = z.infer<typeof ScriptsResponseSchema>
export type UsageResponse = z.infer<typeof UsageResponseSchema>
export type SuggestionsResponse = z.infer<typeof SuggestionsResponseSchema>
export type TrackPayload = z.infer<typeof TrackUsageSchema> 