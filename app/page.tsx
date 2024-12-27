import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import NavBar from "@/components/NavBar"

export default async function Home() {
  const session = await getServerSession()
  const scripts = await prisma.script.findMany({
    orderBy: { createdAt: "desc" },
    include: { owner: true },
  })

  return (
    <main className="container mx-auto px-4 py-8">
      <NavBar isAuthenticated={!!session} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scripts.map((script) => (
          <div
            key={script.id}
            className="border rounded-lg p-6 bg-white shadow-sm"
          >
            <h2 className="text-xl font-semibold mb-2">{script.title}</h2>
            <p className="text-gray-600 mb-4">
              by {script.owner.username} • {script.createdAt.toLocaleDateString()}
            </p>
            <pre className="bg-gray-50 p-4 rounded overflow-x-auto">
              <code>{script.content.slice(0, 200)}...</code>
            </pre>
            <div className="mt-4 flex justify-between items-center">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(script.content)
                }}
                className="text-blue-500 hover:text-blue-600"
              >
                Copy Script
              </button>
              {session && (
                <button className="text-yellow-500 hover:text-yellow-600">
                  {script.starred ? "★ Starred" : "☆ Star"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
