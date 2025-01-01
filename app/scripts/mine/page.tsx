import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export default async function OldMyScriptsPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/api/auth/signin')
  }

  const page = searchParams.page || '1'
  redirect(`/${session.user.username}?page=${page}`)
}
