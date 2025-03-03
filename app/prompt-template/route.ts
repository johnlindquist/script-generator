import { NextResponse } from 'next/server'
import { DRAFT_PASS_PROMPT } from '../api/generate-openrouter/prompt'

// Explicitly declare this route uses Node.js runtime
export const runtime = 'nodejs'

// This endpoint is outside the /api path so it bypasses the middleware
export async function GET() {
  // Return the prompt as plain text
  return new NextResponse(DRAFT_PASS_PROMPT, {
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}
