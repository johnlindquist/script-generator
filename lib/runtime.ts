/**
 * Runtime environment detection utilities
 * @see https://nextjs.org/docs/api-reference/edge-runtime
 */

export type RuntimeEnvironment = 'edge' | 'node' | 'unknown'

/**
 * Detect the current runtime environment
 * Next.js API routes are Node.js by default unless explicitly configured for Edge
 */
export function detectRuntime(): RuntimeEnvironment {
  // Check if we're in a browser
  if (typeof window !== 'undefined') {
    return 'unknown'
  }

  // In Next.js, routes are Node.js by default
  // Edge Runtime must be explicitly enabled with route segment config
  return 'node'
}

export const isEdgeRuntime = detectRuntime() === 'edge'
export const isNodeRuntime = detectRuntime() === 'node'

/**
 * Helper to ensure code is running in the correct runtime
 */
export function assertRuntime(expected: RuntimeEnvironment) {
  const current = detectRuntime()
  if (current !== expected) {
    throw new Error(
      `Runtime mismatch: Expected ${expected} but running in ${current} runtime. ` +
        `Edge Runtime must be explicitly enabled with route segment config.`
    )
  }
}
