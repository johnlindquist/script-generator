import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  const requestId = Math.random().toString(36).substring(7)
  console.log(`[${requestId}] Starting sponsors fetch from static file`)

  try {
    // Read sponsors from a local JSON file written at build time
    const filePath = path.join(process.cwd(), 'public', 'static-sponsors.json')
    const fileData = fs.readFileSync(filePath, 'utf-8')
    const sponsors = JSON.parse(fileData)

    // Transform the data to match the expected format
    const mergedSponsors = sponsors.map(
      (sponsor: {
        login: string
        user: {
          username: string
          fullName: string
        }
      }) => ({
        login: sponsor.login,
        user: sponsor.user,
      })
    )

    console.log(
      `[${requestId}] Successfully loaded ${mergedSponsors.length} sponsors from static file`
    )
    return NextResponse.json(mergedSponsors)
  } catch (error) {
    console.error(`[${requestId}] Error reading static-sponsors.json:`, error)

    // Return mock data in case of error
    return NextResponse.json([
      {
        login: 'johnlindquist',
        user: {
          username: 'johnlindquist',
          fullName: 'John Lindquist',
        },
      },
      {
        login: 'cursor',
        user: {
          username: 'cursor',
          fullName: 'Cursor',
        },
      },
    ])
  }
}
