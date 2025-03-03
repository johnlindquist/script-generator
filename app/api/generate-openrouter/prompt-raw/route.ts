import { NextResponse } from 'next/server'
import { DRAFT_PASS_PROMPT } from '../prompt'

// Explicitly declare this route uses Node.js runtime
export const runtime = 'nodejs'

// This endpoint doesn't require authentication
export async function GET() {
  // Return the prompt as plain text
  return new NextResponse(DRAFT_PASS_PROMPT, {
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}
