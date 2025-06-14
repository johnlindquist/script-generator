// Used for validating the kit-action get test
import { NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      kit: '@johnlindquist/kit',
    },
    { status: 200 }
  )
}
