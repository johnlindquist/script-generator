import { streamText } from 'ai'
import { gateway } from '@/lib/ai-gateway'

export const maxDuration = 60

export async function POST(req: Request) {
  const { prompt }: { prompt: string } = await req.json()

  const result = streamText({
    model: gateway('anthropic/claude-4-sonnet-20250514'),
    prompt: prompt,
    onError: e => {
      console.error('Error while streaming:', e)
    },
  })

  // Try returning the response directly to see if that works
  return new Response(result.textStream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
