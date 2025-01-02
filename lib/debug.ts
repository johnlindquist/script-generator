/**
 * Re-export debug functions from the appropriate runtime implementation
 * API routes use Node.js runtime by default, so export from debug-node
 */
export { debugLog, writeDebugFile } from './debug-node'
