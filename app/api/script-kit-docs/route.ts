import { NextResponse } from 'next/server'
import { getScriptKitDocs } from '@/lib/scriptKitDocs' // This will be the original function

export async function GET(): Promise<NextResponse> {
  try {
    const docs = await getScriptKitDocs()
    return NextResponse.json(docs)
  } catch (error) {
    console.error('Error fetching script kit docs:', error)
    return NextResponse.json({ error: 'Failed to load script kit docs' }, { status: 500 })
  }
}
