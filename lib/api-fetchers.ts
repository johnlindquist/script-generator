import { ScriptsResponse, UsageResponse, SuggestionsResponse } from '@/lib/schemas'

// Typed fetcher for scripts
export const scriptsFetcher = async (url: string): Promise<ScriptsResponse> => {
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error('Failed to fetch scripts')
    }
    return response.json() as Promise<ScriptsResponse>
}

// Typed fetcher for usage
export const usageFetcher = async (url: string): Promise<UsageResponse> => {
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error('Failed to fetch usage')
    }
    return response.json() as Promise<UsageResponse>
}

// Typed fetcher for suggestions
export const suggestionsFetcher = async (url: string): Promise<SuggestionsResponse> => {
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error('Failed to fetch suggestions')
    }
    return response.json() as Promise<SuggestionsResponse>
}

// Generic fetcher with proper error handling
export const typedFetcher = async <T>(url: string): Promise<T> => {
    const response = await fetch(url)
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error((errorData as { error?: string })?.error || `HTTP ${response.status}`)
    }
    return response.json() as Promise<T>
} 