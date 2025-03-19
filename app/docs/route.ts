import { redirect } from 'next/navigation'
import { STRINGS } from '@/lib/strings'

export async function GET() {
  redirect(STRINGS.SOCIAL.DOCS_URL)
}
