"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import NavBar from "@/components/NavBar"

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedScript, setGeneratedScript] = useState("")
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { data: session } = useSession()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsGenerating(true)
    setGeneratedScript("")
    setError(null)

    try {
      console.log("Sending generation request:", { prompt })
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      })

      const contentType = response.headers.get("content-type")
      if (!response.ok) {
        const errorData = contentType?.includes("application/json") 
          ? await response.json()
          : await response.text()
        console.error("Generation failed:", {
          status: response.status,
          statusText: response.statusText,
          contentType,
          errorData
        })
        throw new Error(
          errorData.error || errorData.details || errorData || "Failed to generate script"
        )
      }

      console.log("Generation started, processing stream...")
      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            console.log("Stream complete")
            break
          }

          const text = decoder.decode(value)
          console.log("Received chunk:", { length: text.length })
          setGeneratedScript(prev => prev + text)
        }
      }

      // Don't redirect immediately, let user see the generated script
      setTimeout(() => router.push("/"), 2000)
    } catch (error) {
      console.error("Client-side error:", {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        prompt,
        timestamp: new Date().toISOString()
      })
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <NavBar isAuthenticated={!!session} />

      <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="mb-6">
          <label
            htmlFor="prompt"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Describe your script idea
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Example: A script that finds all large files in a directory and shows their sizes in human-readable format"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isGenerating}
          className={`w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed ${
            isGenerating ? "cursor-wait" : ""
          }`}
        >
          {isGenerating ? "Generating..." : "Generate Script"}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <h3 className="font-semibold mb-2">Error</h3>
          <p className="whitespace-pre-wrap">{error}</p>
        </div>
      )}

      {generatedScript && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Generated Script:</h2>
          <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
            <code>{generatedScript}</code>
          </pre>
        </div>
      )}
    </main>
  )
} 