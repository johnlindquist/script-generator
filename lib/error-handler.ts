import { NextResponse } from 'next/server'
import { logInteraction } from '@/lib/interaction-logger'
import { prisma } from '@/lib/prisma'

export type GenerationErrorType =
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'DAILY_LIMIT'
  | 'VALIDATION'
  | 'DATABASE'
  | 'STREAM'
  | 'ABORT'
  | 'UNKNOWN'

interface ErrorResponse {
  error: string
  details: string
  message: string
  status: number
}

interface ErrorHandlerParams {
  error: Error | unknown
  requestId: string
  interactionTimestamp: string
  routeName: string
  scriptId?: string
  luckyRequestId?: string | null
  source?: 'lucky' | 'direct'
}

const ERROR_RESPONSES: Record<GenerationErrorType, ErrorResponse> = {
  TIMEOUT: {
    error: 'Generation timeout',
    details: 'The generation took too long to complete. Please try again with a simpler prompt.',
    message: 'Your script generation request timed out. Please try again.',
    status: 408,
  },
  UNAUTHORIZED: {
    error: 'Unauthorized',
    details: 'Your session has expired or is invalid.',
    message: 'Please sign in again to continue.',
    status: 401,
  },
  DAILY_LIMIT: {
    error: 'Daily limit exceeded',
    details: 'You have reached your daily generation limit.',
    message: 'Please try again tomorrow.',
    status: 429,
  },
  VALIDATION: {
    error: 'Invalid request',
    details: 'The request parameters were invalid or missing.',
    message: 'Please check your input and try again.',
    status: 400,
  },
  DATABASE: {
    error: 'Database error',
    details: 'There was an error accessing the database.',
    message: 'Please try again. If the problem persists, contact support.',
    status: 500,
  },
  STREAM: {
    error: 'Stream error',
    details: 'There was an error streaming the response.',
    message: 'Please try again. If the problem persists, contact support.',
    status: 500,
  },
  ABORT: {
    error: 'Generation aborted',
    details: 'The script generation was cancelled.',
    message: 'Generation cancelled. You can try again.',
    status: 499, // Client Closed Request
  },
  UNKNOWN: {
    error: 'Unknown error',
    details: 'An unexpected error occurred.',
    message: 'Please try again. If the problem persists, contact support.',
    status: 500,
  },
}

function determineErrorType(error: Error | unknown): GenerationErrorType {
  if (!(error instanceof Error)) {
    return 'UNKNOWN'
  }

  if (error.name === 'AbortError' || error.message.includes('abort')) {
    return 'ABORT'
  }

  if (error.message.includes('timeout')) {
    return 'TIMEOUT'
  }

  if (error.message === 'UNAUTHORIZED' || error.message.includes('unauthorized')) {
    return 'UNAUTHORIZED'
  }

  if (error.message.includes('daily limit') || error.message.includes('rate limit')) {
    return 'DAILY_LIMIT'
  }

  if (error.message.includes('database') || error.message.includes('prisma')) {
    return 'DATABASE'
  }

  if (error.message.includes('stream')) {
    return 'STREAM'
  }

  if (error.message.includes('missing') || error.message.includes('invalid')) {
    return 'VALIDATION'
  }

  return 'UNKNOWN'
}

export async function handleGenerationError({
  error,
  requestId,
  interactionTimestamp,
  routeName,
  scriptId,
  luckyRequestId,
  source = 'direct',
}: ErrorHandlerParams): Promise<NextResponse> {
  const errorType = determineErrorType(error)
  const errorResponse = ERROR_RESPONSES[errorType]

  // Log error details
  await logInteraction(interactionTimestamp, routeName, `Error encountered: ${errorType}`, {
    requestId,
    scriptId,
    luckyRequestId,
    source,
    error: error instanceof Error ? error.message : String(error),
  })

  // Update script status if we have a scriptId
  if (scriptId) {
    try {
      await prisma.script.update({
        where: { id: scriptId },
        data: {
          status: 'ERROR',
          error: error instanceof Error ? error.message : String(error),
        },
      })
    } catch (dbError) {
      console.error('Failed to update script status:', dbError)
    }
  }

  return NextResponse.json(
    {
      error: errorResponse.error,
      details: error instanceof Error ? error.message : errorResponse.details,
      message: errorResponse.message,
    },
    { status: errorResponse.status }
  )
}
