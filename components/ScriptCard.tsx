"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface ScriptCardProps {
  script: {
    id: string
    title: string
    content: string
    starred: boolean
    createdAt: Date
    owner: {
      username: string
      id: string
    }
  }
  isAuthenticated: boolean
  currentUserId?: string
}

export default function ScriptCard({ script, isAuthenticated, currentUserId }: ScriptCardProps) {
  const [isStarred, setIsStarred] = useState(script.starred)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editedContent, setEditedContent] = useState(script.content)
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
      router.refresh()
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

  const handleEdit = async () => {
    try {
      const response = await fetch(`/api/scripts/${script.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editedContent }),
      })

      if (!response.ok) {
        throw new Error("Failed to update script")
      }

      setIsEditing(false)
      router.refresh()
    } catch (error) {
      console.error("Edit error:", error)
      alert("Failed to update script")
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/scripts/${script.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete script")
      }

      const scriptElement = document.querySelector(`[data-script-id="${script.id}"]`)
      scriptElement?.remove()
      router.refresh()
    } catch (error) {
      console.error("Delete error:", error)
      alert("Failed to delete script")
    } finally {
      setIsDeleting(false)
    }
  }

  const isOwner = currentUserId === script.owner.id

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm" data-script-id={script.id}>
      <Link href={`/scripts/${script.id}`} className="block hover:opacity-75 transition-opacity">
        <h2 className="text-xl font-semibold mb-2">{script.title}</h2>
        <p className="text-gray-600 mb-4">
          by {script.owner.username} • {new Date(script.createdAt).toLocaleDateString()}
        </p>
      </Link>
      {isEditing ? (
        <div className="mb-4">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-48 p-4 border rounded-lg font-mono text-sm"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleEdit}
              className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsEditing(false)
                setEditedContent(script.content)
              }}
              className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <Link href={`/scripts/${script.id}`} className="block hover:opacity-75 transition-opacity">
          <pre className="bg-gray-50 p-4 rounded overflow-x-auto">
            <code>{script.content.slice(0, 200)}...</code>
          </pre>
        </Link>
      )}
      <div className="mt-4 flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="text-blue-500 hover:text-blue-600"
          >
            Copy Script
          </button>
          {isOwner && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="text-green-500 hover:text-green-600 ml-4"
              >
                Edit
              </button>
              {!isDeleting ? (
                <button
                  onClick={() => setIsDeleting(true)}
                  className="text-red-500 hover:text-red-600"
                >
                  Delete
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    className="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setIsDeleting(false)}
                    className="bg-gray-500 text-white px-2 py-1 rounded text-sm hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}
        </div>
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