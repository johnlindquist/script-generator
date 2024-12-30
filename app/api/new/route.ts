import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')
  const url = searchParams.get('url')

  return new Response(null, {
    status: 302,
    headers: {
      Location: `kit:new?name=${name}&url=${url}`,
    },
  })
}
