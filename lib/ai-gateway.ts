import { createGatewayProvider } from '@vercel/ai-sdk-gateway'
import { logInteraction } from './interaction-logger'

const timestamp = new Date().toISOString()

logInteraction(timestamp, 'serverRoute', 'Initializing AI Gateway provider', {
  hasBaseURL: !!process.env.AI_GATEWAY_BASE_URL,
  baseURL: process.env.AI_GATEWAY_BASE_URL,
  nodeEnv: process.env.NODE_ENV,
})

export const gateway = createGatewayProvider({
  ...(process.env.AI_GATEWAY_BASE_URL && { baseURL: process.env.AI_GATEWAY_BASE_URL }),
})

logInteraction(timestamp, 'serverRoute', 'AI Gateway provider initialized successfully', {
  hasGateway: !!gateway,
})
