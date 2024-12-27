"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import NavBar from "@/components/NavBar"
import Auth from "@/components/Auth"
import ScriptCard from "@/components/ScriptCard"
import { Editor } from "@monaco-editor/react"

interface ScriptGenerationFormProps {
  prompt: string
  setPrompt: (prompt: string) => void
  isGenerating: boolean
  error: string | null
  generatedScript: string
  editableScript: string
  setEditableScript: (script: string) => void
  onSubmit: (e: React.FormEvent) => Promise<void>
  onSave: () => Promise<void>
}

const LoadingDots = () => (
  <span className="loading-dots">
    <style jsx>{`
      .loading-dots::after {
        content: '';
        animation: dots 1.5s steps(4, end) infinite;
      }
      @keyframes dots {
        0%, 20% { content: ''; }
        40% { content: '.'; }
        60% { content: '..'; }
        80%, 100% { content: '...'; }
      }
    `}</style>
  </span>
);

const ScriptGenerationForm = ({
  prompt,
  setPrompt,
  isGenerating,
  error,
  generatedScript,
  editableScript,
  setEditableScript,
  onSubmit,
  onSave
}: ScriptGenerationFormProps) => (
  <div className="mb-12">
    <h2 className="text-2xl font-bold mb-6">
      {isGenerating ? (
        <span>
          Generating Script<LoadingDots />
        </span>
      ) : generatedScript ? (
        "Edit Generated Script"
      ) : (
        "Generate New Script"
      )}
    </h2>
    {!generatedScript && (
      <form onSubmit={onSubmit} className="max-w-2xl mx-auto">
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
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e as any);
              }
            }}
            disabled={isGenerating}
            className="w-full h-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
    )}

    {error && (
      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <h3 className="font-semibold mb-2">Error</h3>
        <p className="whitespace-pre-wrap">{error}</p>
      </div>
    )}

    {generatedScript && (
      <div className="mt-8">
        <div className="relative mb-2">
          <div className="bg-gray-50 rounded-lg overflow-hidden">
            <Editor
              height="500px"
              defaultLanguage="typescript"
              value={editableScript}
              onChange={(value) => setEditableScript(value || "")}
              theme="vs-dark"
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                readOnly: isGenerating,
                // Disable all error highlighting and validation
                semanticHighlighting: { enabled: false },
                semanticValidation: false,
                syntaxValidation: false,
                formatOnType: false,
                formatOnPaste: false,
                hover: { enabled: false },
                suggestOnTriggerCharacters: false,
                parameterHints: { enabled: false },
                quickSuggestions: false,
                wordBasedSuggestions: false,
                inlayHints: { enabled: false },
                renderValidationDecorations: "off"
              }}
            />
          </div>
          {!isGenerating && (
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(editableScript)
                }}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600 transition-colors"
              >
                Copy Script
              </button>
              <button
                onClick={onSave}
                className="bg-green-500 text-white px-4 py-2 rounded-lg shadow hover:bg-green-600 transition-colors"
              >
                Save Script
              </button>
              <button
                onClick={() => {
                  setPrompt("")
                  setEditableScript("")
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg shadow hover:bg-gray-600 transition-colors"
              >
                Generate Another
              </button>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
)

export default function Home() {
  const { data: session, status } = useSession()
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedScript, setGeneratedScript] = useState("")
  const [editableScript, setEditableScript] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [scripts, setScripts] = useState<any[]>([])
  const [showGenerateForm, setShowGenerateForm] = useState(true)

  // Add debug logging for session
  useEffect(() => {
    console.log("Session Debug Info:", {
      session,
      status,
      userId: session?.user?.id,
      isAuthenticated: !!session
    })
  }, [session, status])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsGenerating(true)
    setGeneratedScript("")
    setEditableScript("")
    setError(null)

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        const errorData = contentType?.includes("application/json")
          ? await response.json()
          : await response.text()
        throw new Error(
          errorData.error || errorData.details || "Failed to generate script"
        )
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullScript = ""

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value)
          fullScript += text
          setGeneratedScript(fullScript)
          setEditableScript(fullScript)
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async () => {
    try {
      console.log('Attempting to save script:', {
        promptLength: prompt.length,
        codeLength: editableScript.length,
        userId: session?.user?.id
      });

      const response = await fetch("/api/scripts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          code: editableScript,
        }),
      })

      const responseData = await response.json().catch(e => ({ error: 'Failed to parse response' }));
      console.log('Save script response:', {
        status: response.status,
        ok: response.ok,
        data: responseData
      });

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || `Failed to save script (Status: ${response.status})`)
      }

      // Refresh scripts list
      const scriptsResponse = await fetch("/api/scripts")
      if (scriptsResponse.ok) {
        const newScripts = await scriptsResponse.json()
        setScripts(newScripts)
      } else {
        console.error('Failed to refresh scripts list:', {
          status: scriptsResponse.status,
          statusText: scriptsResponse.statusText
        });
      }

      // Reset state
      setPrompt("")
      setGeneratedScript("")
      setEditableScript("")
      setShowGenerateForm(true)
    } catch (error) {
      console.error('Save script error:', {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      setError(error instanceof Error ? error.message : String(error))
    }
  }

  // Fetch scripts on mount
  useEffect(() => {
    fetch("/api/scripts")
      .then(res => res.json())
      .then(data => setScripts(data))
      .catch(console.error)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar isAuthenticated={!!session} />
      <main className="container mx-auto px-4 py-8">
        {status === "loading" ? (
          <div>Loading...</div>
        ) : !session ? (
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Welcome to Script Generator</h2>
            <p className="text-gray-600 mb-8">Sign in to start generating scripts!</p>
            <Auth>
              <div>Sign in to continue</div>
            </Auth>
          </div>
        ) : (
          <>
            <ScriptGenerationForm
              prompt={prompt}
              setPrompt={setPrompt}
              isGenerating={isGenerating}
              error={error}
              generatedScript={generatedScript}
              editableScript={editableScript}
              setEditableScript={setEditableScript}
              onSubmit={handleGenerate}
              onSave={handleSave}
            />

            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6">Your Scripts</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {scripts.map((script) => (
                  <ScriptCard
                    key={script.id}
                    script={script}
                    isAuthenticated={!!session}
                    currentUserId={session.user?.id}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
