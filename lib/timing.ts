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

export function wrapApiHandler<T extends TimedResponse>(
  operation: string,
  handler: (req: NextRequest, ...args: unknown[]) => Promise<T>
) {
  return async (req: NextRequest, ...args: unknown[]): Promise<T> => {
    return withTiming(operation, () => handler(req, ...args))
  }
}
