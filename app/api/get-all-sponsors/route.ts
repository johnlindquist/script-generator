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

    console.log(`[${requestId}] Successfully loaded ${sponsors.length} sponsors from static file`)
    return NextResponse.json(sponsors)
  } catch (error) {
    console.error(`[${requestId}] Error reading static-sponsors.json:`, error)

    // Return mock data in case of error
    return NextResponse.json([
      {
        __typename: 'User',
        login: 'johnlindquist',
        id: 'MDQ6VXNlcjE2Mzk=',
        databaseId: 1639,
        user: {
          username: 'johnlindquist',
          fullName: 'John Lindquist',
        },
      },
      {
        __typename: 'User',
        login: 'cursor',
        id: 'MDQ6VXNlcjQ2Mjc2',
        databaseId: 46276,
        user: {
          username: 'cursor',
          fullName: 'Cursor',
        },
      },
    ])
  }
}
