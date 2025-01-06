import { NextRequest, NextResponse } from 'next/server'

export type TimedResponse = Response | NextResponse

export interface TimingInfo {
  operation: string
  durationMs: number
  success: boolean
}

export async function withTiming<T extends TimedResponse>(
  operation: string,
  handler: () => Promise<T>
): Promise<T> {
  const start = Date.now()
  let success = true

  try {
    const response = await handler()
    return response
  } catch (error) {
    success = false
    throw error
  } finally {
    const durationMs = Date.now() - start
    console.log(
      JSON.stringify({
        timing: {
          operation,
          durationMs,
          success,
        },
      })
    )
  }
}

export interface RouteContext {
  params: Promise<Record<string, string>>
  searchParams: Promise<Record<string, string>>
}

export function wrapApiHandler<T extends TimedResponse>(
  operation: string,
  handler: (req: NextRequest, context?: RouteContext) => Promise<T>
) {
  return async (req: NextRequest, context?: RouteContext): Promise<T> => {
    return withTiming(operation, () => handler(req, context))
  }
}
