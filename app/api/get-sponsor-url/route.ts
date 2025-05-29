import { NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  return new NextResponse(
    'https://github.com/sponsors/johnlindquist/sponsorships?sponsor=johnlindquist&tier_id=235205',
    {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    }
  )
}
