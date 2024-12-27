"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Highlight, Prism, themes } from "prism-react-renderer";

// Initialize Prism with TypeScript support
(typeof global !== "undefined" ? global : window).Prism = Prism;
require("prismjs/components/prism-typescript");

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

  console.log('ScriptCard Debug Info:', {
    currentUserId,
    ownerId: script.owner.id,
    ownerUsername: script.owner.username,
    isOwner,
    scriptId: script.id
  })

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm" data-script-id={script.id}>
      <Link href={`/scripts/${script.id}`} className="block hover:opacity-75 transition-opacity">
        <h2 className="text-xl font-semibold mb-2">{script.title}</h2>
        <p className="text-gray-600 mb-4">
          by {script.owner.username} • {new Date(script.createdAt).toLocaleDateString()}
          {!isOwner && (
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              <svg className="w-4 h-4 mr-1" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              {script.owner.username}
            </span>
          )}
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
          <div className="bg-gray-50 rounded overflow-x-auto">
            <Highlight
              theme={themes.vsDark}
              code={script.content.slice(0, 200) + "..."}
              language="typescript"
              prism={Prism}
            >
              {({ className, style, tokens, getLineProps, getTokenProps }) => (
                <pre className={`${className} p-4`} style={style}>
                  {tokens.map((line, i) => (
                    <div key={i} {...getLineProps({ line })}>
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </div>
                  ))}
                </pre>
              )}
            </Highlight>
          </div>
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