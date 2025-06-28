import useSWR from 'swr'
import { logInteraction } from '@/lib/interaction-logger'
import React from 'react'

interface SuggestionsResponse {
  suggestions: string[]
  error?: string
}

async function fetchNextSuggestions(
  url: string,
  breadcrumb: string,
  sessionInteractionId: string,
  refreshVersion: number
): Promise<string[]> {
  if (!breadcrumb || !sessionInteractionId) {
    logInteraction(
      sessionInteractionId || 'unknown-session',
      'client',
      'useNextSuggestions: fetchNextSuggestions called with invalid params',
      { breadcrumb, sessionInteractionId }
    )
    return []
  }

  logInteraction(sessionInteractionId, 'client', 'useNextSuggestions: fetching next suggestions', {
    breadcrumb,
    refreshVersion,
  })

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        breadcrumb,
        sessionInteractionId,
        currentStep: breadcrumb.split(' → ').length,
        maxDepth: 10,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json() as { error?: string }
      logInteraction(
        sessionInteractionId,
        'client',
        'useNextSuggestions: fetch error - response not ok',
        {
          status: response.status,
          statusText: response.statusText,
          errorData,
          breadcrumb,
        }
      )
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json() as SuggestionsResponse

    if (data.error) {
      logInteraction(
        sessionInteractionId,
        'client',
        'useNextSuggestions: fetch error - data error',
        { error: data.error, breadcrumb }
      )
      throw new Error(data.error)
    }

    logInteraction(sessionInteractionId, 'client', 'useNextSuggestions: fetch success', {
      suggestions: data.suggestions,
      breadcrumb,
    })
    return data.suggestions
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logInteraction(
      sessionInteractionId,
      'client',
      'useNextSuggestions: fetch failed with exception',
      { error: errorMessage, breadcrumb }
    )
    console.error('Error fetching next suggestions:', error)
    throw error instanceof Error ? error : new Error('Failed to fetch suggestions')
  }
}

export function useNextSuggestions(
  breadcrumb: string,
  sessionInteractionId: string,
  refreshVersion: number
) {
  const swrKey = React.useMemo(() => {
    if (!breadcrumb || !sessionInteractionId) {
      return null
    }
    return ['/api/next-suggestions', breadcrumb, sessionInteractionId, refreshVersion]
  }, [breadcrumb, sessionInteractionId, refreshVersion])

  const { data, error, isLoading, mutate } = useSWR<string[], Error>(
    swrKey,
    ([url, currentBreadcrumb, currentSessionId, currentRefreshVersion]) =>
      fetchNextSuggestions(url, currentBreadcrumb, currentSessionId, currentRefreshVersion),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      keepPreviousData: true,
    }
  )

  React.useEffect(() => {
    logInteraction(
      sessionInteractionId || 'unknown-session',
      'client',
      'useNextSuggestions: SWR state update',
      {
        breadcrumb,
        sessionInteractionId,
        refreshVersion,
        isLoading,
        hasData: !!data,
        dataLength: data?.length,
        hasError: !!error,
        errorMessage: error?.message,
      }
    )
  }, [breadcrumb, sessionInteractionId, refreshVersion, data, error, isLoading])

  return {
    suggestions: data || [],
    isLoading,
    error,
    mutate,
  }
}
