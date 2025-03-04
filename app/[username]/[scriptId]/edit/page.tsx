import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import EditScriptClient from './EditScriptClient'

export default async function EditScriptPage({
  params,
}: {
  params: { username: string; scriptId: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/api/auth/signin')

  // 1. Look up the user
  const user = await prisma.user.findUnique({
    where: { username: params.username },
  })
  if (!user) notFound()

  // 2. Look up the script
  const script = await prisma.script.findFirst({
    where: {
      id: params.scriptId,
      ownerId: user.id,
    },
  })
  if (!script) notFound()

  // 3. Check if locked
  if (script.locked) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black px-8 py-4">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-red-400 mb-4">
            This script is locked and cannot be edited.
          </h1>
        </div>
      </main>
    )
  }

  // 4. If user is NOT the owner, block them
  if (script.ownerId !== session.user.id) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black px-8 py-4">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-red-400 mb-4">
            You are not authorized to edit this script.
          </h1>
        </div>
      </main>
    )
  }

  // 5. Otherwise, render the client component with script data
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black px-8 py-4">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-amber-300 mb-4">Editing {script.title}</h1>
        <EditScriptClient
          initialContent={script.content}
          initialTitle={script.title}
          username={params.username}
          scriptId={params.scriptId}
        />
      </div>
    </main>
  )
}
