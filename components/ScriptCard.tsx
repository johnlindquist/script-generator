"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface ScriptCardProps {
  script: {
    id: string
    title: string
    content: string
    starred: boolean
    createdAt: Date
    owner: {
      username: string
    }
  }
  isAuthenticated: boolean
}

export default function ScriptCard({ script, isAuthenticated }: ScriptCardProps) {
  const [isStarred, setIsStarred] = useState(script.starred)
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()

  const handleStar = async () => {
    if (!isAuthenticated) return
    setIsUpdating(true)

    try {
      const response = await fetch("/api/star", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptId: script.id }),
      })

      if (!response.ok) {
        throw new Error("Failed to update star status")
      }

      setIsStarred(!isStarred)
      router.refresh() // Refresh the page to update the data
    } catch (error) {
      console.error("Star error:", error)
      alert("Failed to update star status")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(script.content)
  }

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <h2 className="text-xl font-semibold mb-2">{script.title}</h2>
      <p className="text-gray-600 mb-4">
        by {script.owner.username} • {new Date(script.createdAt).toLocaleDateString()}
      </p>
      <pre className="bg-gray-50 p-4 rounded overflow-x-auto">
        <code>{script.content.slice(0, 200)}...</code>
      </pre>
      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={handleCopy}
          className="text-blue-500 hover:text-blue-600"
        >
          Copy Script
        </button>
        {isAuthenticated && (
          <button
            onClick={handleStar}
            disabled={isUpdating}
            className={`text-yellow-500 hover:text-yellow-600 ${
              isUpdating ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isStarred ? "★ Starred" : "☆ Star"}
          </button>
        )}
      </div>
    </div>
  )
} 