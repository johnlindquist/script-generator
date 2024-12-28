"use client"

import { useState, useEffect, useRef } from "react"
import { useSession, signIn } from "next-auth/react"
import NavBar from "@/components/NavBar"
import Auth from "@/components/Auth"
import ScriptCard from "@/components/ScriptCard"
import { Editor } from "@monaco-editor/react"
import ScriptSuggestions from "@/components/ScriptSuggestions"
import { monacoOptions, initializeTheme } from "@/lib/monaco"
import { 
  RocketLaunchIcon, 
  ClipboardIcon, 
  DocumentCheckIcon, 
  ArrowPathIcon 
} from "@heroicons/react/24/solid"
import debounce from "lodash.debounce"
import { toast } from "react-hot-toast"

interface ScriptGenerationFormProps {
  prompt: string
  setPrompt: (prompt: string) => void
  isGenerating: boolean
  error: string | null
  generatedScript: string | null
  editableScript: string
  setEditableScript: (script: string) => void
  onSubmit: (prompt: string, requestId: string) => void
  onSave: () => void
  isAuthenticated: boolean
  setGeneratedScript: (script: string | null) => void
  setError: (error: string | null) => void
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
  onSave,
  isAuthenticated,
  setGeneratedScript,
  setError
}: ScriptGenerationFormProps) => {
  const editorRef = useRef<any>(null);
  const prevIsGeneratingRef = useRef(isGenerating);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  // Generate a unique ID for this script generation
  const generateRequestId = () => {
    return crypto.randomUUID();
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    if (!isAuthenticated) {
      signIn();
      return;
    }

    const requestId = generateRequestId();
    onSubmit(prompt, requestId);
  };

  // Scroll while generating
  useEffect(() => {
    if (editorRef.current && isGenerating) {
      const model = editorRef.current.getModel();
      if (model) {
        const lineCount = model.getLineCount();
        editorRef.current.revealLine(lineCount);
      }
    }
  }, [editableScript, isGenerating]);

  // Final scroll when generation completes
  useEffect(() => {
    if (prevIsGeneratingRef.current && !isGenerating && editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        const lineCount = model.getLineCount();
        editorRef.current.revealLine(lineCount);
      }
    }
    prevIsGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold mb-6 text-center">
        {isGenerating ? (
          <span>
            Generating Script<LoadingDots />
          </span>
        ) : generatedScript ? (
          "Edit Generated Script"
        ) : (
          "Enter Your Script Idea"
        )}
      </h2>
      {!generatedScript && (
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="mb-6">
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => isAuthenticated && setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              disabled={isGenerating || !isAuthenticated}
              className={`w-full h-32 px-3 py-2 bg-zinc-900/90 text-slate-300 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed ${!isAuthenticated ? 'cursor-pointer' : ''}`}
              placeholder={isAuthenticated ? "Example: A script that finds all large files in a directory and shows their sizes in human-readable format" : "Sign in to start generating scripts!"}
              required
              onClick={() => !isAuthenticated && signIn()}
            />
            <ScriptSuggestions setPrompt={(suggestion) => {
              if (!isAuthenticated) {
                signIn();
                return;
              }
              setPrompt(suggestion);
            }} />
          </div>

          <button
            type="submit"
            disabled={isGenerating}
            className={`w-1/2 bg-gradient-to-tr from-amber-300 to-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl transition flex items-center justify-center gap-2 mx-auto ${
              isGenerating ? "cursor-wait" : !isAuthenticated ? "cursor-pointer" : ""
            }`}
            onClick={() => !isAuthenticated && signIn()}
          >
            {isGenerating ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : !isAuthenticated ? (
              <>
                <RocketLaunchIcon className="w-5 h-5" />
                Sign in to Generate
              </>
            ) : (
              <>
                <RocketLaunchIcon className="w-5 h-5" />
                Generate Script
              </>
            )}
          </button>
        </form>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-900/20 border border-red-700/50 rounded-lg text-red-400">
          <h3 className="font-semibold mb-2">Error</h3>
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {(isGenerating || generatedScript) && (
        <div className="mt-8">
          <div className="relative mb-2">
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              <div className="w-full h-[600px] relative">
                <Editor
                  height="100%"
                  defaultLanguage="typescript"
                  value={editableScript}
                  onChange={(value) => isAuthenticated && setEditableScript(value || "")}
                  options={{
                    ...monacoOptions,
                    readOnly: !isAuthenticated,
                    domReadOnly: !isAuthenticated,
                  }}
                  beforeMount={initializeTheme}
                  theme="brillance-black"
                  onMount={handleEditorDidMount}
                />
              </div>
            </div>
            {!isGenerating && (
              <div className="absolute bottom-4 right-4 flex gap-2">
                {isAuthenticated && (
                  <>
                    <button
                      onClick={onSave}
                      className="bg-gradient-to-tr from-amber-300 to-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition-colors flex items-center gap-2"
                    >
                      <DocumentCheckIcon className="w-5 h-5" />
                      Save Script
                    </button>
                    <button
                      onClick={() => {
                        setPrompt("")
                        setEditableScript("")
                        setGeneratedScript(null)
                        setError(null)
                      }}
                      className="bg-gradient-to-tr from-gray-700 to-gray-800 text-slate-300 px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition-colors flex items-center gap-2"
                    >
                      <ArrowPathIcon className="w-5 h-5" />
                      Start Over
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const { data: session, status } = useSession()
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedScript, setGeneratedScript] = useState<string | null>(null)
  const [editableScript, setEditableScript] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [scripts, setScripts] = useState<any[]>([])
  const [showGenerateForm, setShowGenerateForm] = useState(true)
  const textBufferRef = useRef("")
  const [page, setPage] = useState(1)
  const [pageSize] = useState(9)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch scripts with pagination
  const fetchScripts = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/scripts?page=${page}&pageSize=${pageSize}`)
      if (!response.ok) throw new Error("Failed to fetch scripts")
      const data = await response.json()
      setScripts(data.scripts)
      setTotalPages(data.totalPages)
      return data
    } catch (error) {
      console.error("Error fetching scripts:", error)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch scripts when page changes
  useEffect(() => {
    fetchScripts()
  }, [page, pageSize])

  // Listen for script deletion
  useEffect(() => {
    const handleScriptDeleted = () => {
      // Re-fetch scripts and reset to first page if current page would be empty
      fetchScripts().then((data) => {
        if (data?.scripts?.length === 0 && page > 1) {
          setPage(1)
        }
      })
    }

    window.addEventListener('scriptDeleted', handleScriptDeleted)
    return () => window.removeEventListener('scriptDeleted', handleScriptDeleted)
  }, [page])

  // Throttled update function
  const updateEditorContent = useRef(
    debounce((content: string) => {
      setGeneratedScript(content)
      setEditableScript(content)
    }, 100)
  ).current

  // Add debug logging for session
  useEffect(() => {
    console.log("Session Debug Info:", {
      session,
      status,
      userId: session?.user?.id,
      isAuthenticated: !!session
    })
  }, [session, status])

  // Handle script generation
  const handleSubmit = async (prompt: string, requestId: string) => {
    setIsGenerating(true);
    setError(null);
    setGeneratedScript(null);
    setEditableScript("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, requestId }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate script");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No reader available");
      }

      let script = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        script += text;
        setEditableScript(prev => prev + text);
      }

      setGeneratedScript(script);
    } catch (err) {
      console.error("Generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate script");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle saving the script
  const handleSave = async () => {
    try {
      const response = await fetch("/api/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt, 
          code: editableScript,
          saved: true 
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save script");
      }

      toast.success("Script saved successfully!");
      // Reset form state after successful save
      setPrompt("");
      setEditableScript("");
      setGeneratedScript(null);
      setError(null);
      
      // Refresh the scripts list
      fetchScripts();
      
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save script");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black px-8 py-4">
      <NavBar isAuthenticated={!!session} />
      <div className="container mx-auto px-4 py-8">
        {status === "loading" ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-amber-400"></div>
          </div>
        ) : (
          <>
            <div className="mb-12 text-center">
              <h2 className="text-2xl font-bold mb-4 text-amber-300">Welcome to Script Generator</h2>
              {session ? (
                <p className="text-slate-300 mb-8">
                  Hello <strong>{session.user?.name || session.user?.email}</strong>!<br />
                  Feel free to generate new scripts or browse existing ones.
                </p>
              ) : (
                <p className="text-slate-300 mb-8">
                  Browse existing scripts below or <button onClick={() => signIn()} className="text-amber-400 hover:underline">sign in</button> to generate your own!
                </p>
              )}
            </div>

            {/* Always show generation form */}
            {showGenerateForm && (
              <ScriptGenerationForm
                prompt={prompt}
                setPrompt={setPrompt}
                isGenerating={isGenerating}
                error={error}
                generatedScript={generatedScript}
                editableScript={editableScript}
                setEditableScript={setEditableScript}
                onSubmit={handleSubmit}
                onSave={handleSave}
                isAuthenticated={!!session}
                setGeneratedScript={setGeneratedScript}
                setError={setError}
              />
            )}

            {/* Scripts list visible to everyone */}
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

            {/* Pagination Controls */}
            {scripts.length > 0 && (
              <div className="mt-8 flex justify-center items-center gap-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoading}
                  className="px-4 py-2 bg-amber-400/10 text-amber-300 rounded-lg hover:bg-amber-400/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-slate-300">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || isLoading}
                  className="px-4 py-2 bg-amber-400/10 text-amber-300 rounded-lg hover:bg-amber-400/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
