import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export default async function NewScriptPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/api/auth/signin')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black px-8 py-4">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-amber-300 mb-4">Create New Script</h1>
        <form
          action={async (formData: FormData) => {
            'use server'
            const title = formData.get('title')
            const content = formData.get('content')

            if (!title || !content) {
              return
            }

            const response = await fetch('/api/scripts', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title,
                content,
              }),
            })

            if (!response.ok) {
              return
            }

            const data = await response.json()
            redirect(`/${session.user.username}/${data.id}`)
          }}
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300">
                Title
              </label>
              <input
                type="text"
                name="title"
                id="title"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 bg-neutral-800 text-gray-100"
                placeholder="My Awesome Script"
              />
            </div>
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-300">
                Content
              </label>
              <textarea
                name="content"
                id="content"
                rows={10}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 bg-neutral-800 text-gray-100 font-mono"
                placeholder="// Your script here..."
              />
            </div>
            <button
              type="submit"
              className="inline-flex justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-primary-foreground shadow-sm  focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            >
              Create Script
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
