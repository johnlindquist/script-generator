"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Highlight, Prism, themes } from "prism-react-renderer";
import { 
  ClipboardIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  StarIcon as StarIconSolid
} from "@heroicons/react/24/solid"
import { StarIcon as StarIconOutline } from "@heroicons/react/24/outline"

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
  const [isDeleting, setIsDeleting] = useState(false)
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

  const handleEdit = () => {
    router.push(`/scripts/${script.id}`)
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
    <div className="border border-gray-800 rounded-lg p-6 bg-gray-900/80 shadow-2xl flex flex-col h-[500px] break-inside hover:border-amber-400/20 transition-colors" data-script-id={script.id}>
      <div className="mb-4">
        <Link href={`/scripts/${script.id}`} className="block hover:opacity-75 transition-opacity">
          <h2 className="text-xl font-lexend font-semibold mb-2 text-amber-300">{script.title}</h2>
          <p className="text-slate-400 text-sm">
            by {script.owner.username} • {new Date(script.createdAt).toLocaleDateString()}
            {!isOwner && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-400/10 text-amber-300">
                <svg className="w-4 h-4 mr-1" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                {script.owner.username}
              </span>
            )}
          </p>
        </Link>
      </div>
      <div className="flex-grow flex flex-col">
        <Link href={`/scripts/${script.id}`} className="block flex-grow">
          <div className="bg-gray-950 rounded-lg overflow-hidden h-full border border-amber-400/10 hover:border-amber-400/20 transition-colors">
            <Highlight
              theme={themes.vsDark}
              code={script.content.slice(0, 200) + "..."}
              language="typescript"
              prism={Prism}
            >
              {({ className, style, tokens, getLineProps, getTokenProps }) => (
                <pre className={`${className} p-4 h-full`} style={{ ...style, margin: 0, background: 'transparent' }}>
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
      </div>
      <div className="mt-4 flex justify-between items-center border-t border-amber-400/10 pt-4">
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="text-amber-300 hover:text-amber-200 transition flex items-center gap-1"
          >
            <ClipboardIcon className="w-4 h-4" />
            Copy Script
          </button>
          {isOwner && (
            <>
              <button
                onClick={handleEdit}
                className="text-amber-300 hover:text-amber-200 transition ml-4 flex items-center gap-1"
              >
                <PencilSquareIcon className="w-4 h-4" />
                Edit
              </button>
              {!isDeleting ? (
                <button
                  onClick={() => setIsDeleting(true)}
                  className="text-red-400 hover:text-red-300 transition flex items-center gap-1"
                >
                  <TrashIcon className="w-4 h-4" />
                  Delete
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    className="bg-red-500/20 text-red-300 px-3 py-1.5 rounded-md text-sm hover:bg-red-500/30 transition flex items-center gap-1"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setIsDeleting(false)}
                    className="bg-gray-800 text-amber-300 border border-amber-400/20 px-3 py-1.5 rounded-md text-sm hover:bg-amber-400/10 transition"
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
            className={`text-amber-300 hover:text-amber-200 transition flex items-center gap-1 ${
              isUpdating ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isStarred ? (
              <>
                <StarIconSolid className="w-4 h-4" />
                Starred
              </>
            ) : (
              <>
                <StarIconOutline className="w-4 h-4" />
                Star
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
} 