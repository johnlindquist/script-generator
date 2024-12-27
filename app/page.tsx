"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
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
}: ScriptGenerationFormProps) => {
  const editorRef = useRef<any>(null);
  const prevIsGeneratingRef = useRef(isGenerating);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
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
        <form onSubmit={onSubmit} className="max-w-2xl mx-auto">
          <div className="mb-6">
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
              className="w-full h-32 px-3 py-2 bg-zinc-900/90 text-slate-300 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Example: A script that finds all large files in a directory and shows their sizes in human-readable format"
              required
            />
            <ScriptSuggestions setPrompt={setPrompt} />
          </div>

          <button
            type="submit"
            disabled={isGenerating}
            className={`w-1/2 bg-gradient-to-tr from-amber-300 to-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl transition flex items-center justify-center gap-2 mx-auto ${
              isGenerating ? "cursor-wait" : ""
            }`}
          >
            {isGenerating ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                Generating...
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
          <p className="whitespace-pre-wrap">{error}</p>
        </div>
      )}

      {generatedScript && (
        <div className="mt-8">
          <div className="relative mb-2">
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              <div className="w-full h-[600px] relative">
                <Editor
                  height="100%"
                  defaultLanguage="typescript"
                  value={editableScript}
                  onChange={(value) => setEditableScript(value || "")}
                  options={monacoOptions}
                  beforeMount={initializeTheme}
                  theme="brillance-black"
                  onMount={handleEditorDidMount}
                />
              </div>
            </div>
            {!isGenerating && (
              <div className="absolute bottom-4 right-4 flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(editableScript)
                  }}
                  className="bg-gradient-to-tr from-cyan-300 to-cyan-400 text-gray-900 font-semibold px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition-colors flex items-center gap-2"
                >
                  <ClipboardIcon className="w-5 h-5" />
                  Copy Script
                </button>
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
                  }}
                  className="bg-gradient-to-tr from-gray-700 to-gray-800 text-slate-300 px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition-colors flex items-center gap-2"
                >
                  <ArrowPathIcon className="w-5 h-5" />
                  Generate Another
                </button>
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
  const [generatedScript, setGeneratedScript] = useState("")
  const [editableScript, setEditableScript] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [scripts, setScripts] = useState<any[]>([])
  const [showGenerateForm, setShowGenerateForm] = useState(true)
  const textBufferRef = useRef("")

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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsGenerating(true)
    setGeneratedScript("")
    setEditableScript("")
    setError(null)
    textBufferRef.current = ""

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
          textBufferRef.current += text
          updateEditorContent(textBufferRef.current)
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      // Ensure the final content is set
      updateEditorContent.flush()
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
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <NavBar isAuthenticated={!!session} />
      <main className="container mx-auto px-4 py-8">
        {status === "loading" ? (
          <div>Loading...</div>
        ) : !session ? (
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold mb-4 text-amber-300">Welcome to Script Generator</h2>
            <p className="text-slate-300 mb-8">Sign in to start generating scripts!</p>
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
              <h2 className="text-2xl font-bold mb-6 text-amber-300">Your Scripts</h2>
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
