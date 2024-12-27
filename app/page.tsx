"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import NavBar from "@/components/NavBar"
import Auth from "@/components/Auth"
import ScriptCard from "@/components/ScriptCard"
import { Highlight, Prism, themes } from "prism-react-renderer"

// Initialize Prism with TypeScript support
(typeof global !== "undefined" ? global : window).Prism = Prism;
require("prismjs/components/prism-typescript");

interface ScriptGenerationFormProps {
  prompt: string
  setPrompt: (prompt: string) => void
  isGenerating: boolean
  error: string | null
  generatedScript: string
  onSubmit: (e: React.FormEvent) => Promise<void>
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
  onSubmit
}: ScriptGenerationFormProps) => (
  <div className="mb-12">
    <h2 className="text-2xl font-bold mb-6">Generate New Script</h2>
    <form onSubmit={onSubmit} className="max-w-2xl">
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

    {error && (
      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <h3 className="font-semibold mb-2">Error</h3>
        <p className="whitespace-pre-wrap">{error}</p>
      </div>
    )}

    {generatedScript && (
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Generated Script:</h2>
        <div className="relative mb-2">
          <div className="bg-gray-50 rounded-lg overflow-x-auto">
            <Highlight
              theme={themes.vsDark}
              code={generatedScript}
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
          {!isGenerating && (
            <div className="absolute bottom-4 right-4">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedScript)
                }}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600 transition-colors"
              >
                Copy Script
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
    setError(null)
    setShowGenerateForm(false)

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

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value)
          setGeneratedScript(prev => {
            const newScript = prev + text
            setEditableScript(newScript)
            return newScript
          })
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
    <main className="container mx-auto px-4 py-8">
      <NavBar isAuthenticated={!!session} />

      {/* Script Generation Form */}
      {status === "authenticated" ? (
        <Auth>
          {showGenerateForm ? (
            <ScriptGenerationForm
              prompt={prompt}
              setPrompt={setPrompt}
              isGenerating={isGenerating}
              error={error}
              generatedScript={generatedScript}
              onSubmit={handleGenerate}
            />
          ) : (
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6">
                {isGenerating ? (
                  <span>
                    Generating Script<LoadingDots />
                  </span>
                ) : (
                  "Edit Generated Script"
                )}
              </h2>
              <div className="max-w-2xl">
                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    <h3 className="font-semibold mb-2">Error</h3>
                    <p className="whitespace-pre-wrap">{error}</p>
                  </div>
                )}

                {(generatedScript || editableScript) && (
                  <div className="mt-8">
                    <div className="relative mb-2">
                      <div className="bg-gray-50 rounded-lg overflow-x-auto">
                        {isGenerating ? (
                          <Highlight
                            theme={themes.vsDark}
                            code={generatedScript}
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
                        ) : (
                          <div className="relative">
                            <Highlight
                              theme={themes.vsDark}
                              code={editableScript}
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
                            <textarea
                              value={editableScript}
                              onChange={(e) => setEditableScript(e.target.value)}
                              className="absolute inset-0 w-full h-full p-4 font-mono text-sm bg-transparent text-transparent caret-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                              spellCheck="false"
                            />
                          </div>
                        )}
                      </div>
                      {!isGenerating && (
                        <div className="absolute bottom-4 right-4 flex gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(editableScript)
                            }}
                            className="bg-gray-500 text-white px-4 py-2 rounded-lg shadow hover:bg-gray-600 transition-colors"
                          >
                            Copy
                          </button>
                          <button
                            onClick={handleSave}
                            className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600 transition-colors"
                          >
                            Save Script
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Auth>
      ) : status === "unauthenticated" ? (
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Welcome to Script Generator</h2>
          <p className="text-gray-600 mb-8">Sign in to start generating scripts!</p>
        </div>
      ) : (
        <div className="mb-12 text-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      )}

      {/* Scripts List */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Your Scripts</h2>
        {status === "loading" ? (
          <div className="text-center text-gray-500">Loading scripts...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scripts.map((script) => (
              <ScriptCard
                key={script.id}
                script={script}
                isAuthenticated={!!session}
                currentUserId={session?.user?.id}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
