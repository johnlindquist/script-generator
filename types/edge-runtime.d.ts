/**
 * Type definitions for Edge Runtime globals
 * @see https://nextjs.org/docs/api-reference/edge-runtime
 */

// The Edge Runtime global is a string when in Edge Runtime
// and undefined in other environments
declare const EdgeRuntime: 'edge' | undefined

// Augment the ProcessEnv interface to ensure we only use supported env variables
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test'
    [key: string]: string | undefined
  }
}
