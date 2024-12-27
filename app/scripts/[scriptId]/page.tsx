"use client";

import { useEffect, useState, use } from "react";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { Editor } from "@monaco-editor/react";
import debounce from "lodash.debounce";
import { monacoOptions, initializeTheme } from "@/lib/monaco";

interface ScriptPageProps {
  params: Promise<{ scriptId: string }>;
}

export default function ScriptPage({ params }: ScriptPageProps) {
  const { scriptId } = use(params);
  const [script, setScript] = useState<any>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchScript = async () => {
      console.log("Fetching script with ID:", scriptId);
      try {
        const response = await fetch(`/api/scripts/${scriptId}`);
        console.log("Response status:", response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error response:", {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          throw new Error(`Failed to fetch script: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Successfully fetched script:", data);
        setScript(data);
        setContent(data.content);
        setError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error("Error fetching script:", {
          error,
          message: errorMessage,
          scriptId: scriptId
        });
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchScript();
  }, [scriptId]);

  const saveScript = async (updatedContent: string) => {
    if (!script || saving) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/scripts/${scriptId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: updatedContent }),
      });

      if (!response.ok) {
        throw new Error("Failed to save script");
      }

      toast.success("Script saved");
    } catch (error) {
      console.error("Error saving script:", error);
      toast.error("Failed to save script");
    } finally {
      setSaving(false);
    }
  };

  // Debounced save function
  const debouncedSave = debounce(saveScript, 1000);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  const handleEditorChange = (value: string | undefined) => {
    const newContent = value || "";
    setContent(newContent);
    debouncedSave(newContent);
  };

  const handleShare = async () => {
    const url = window.location.href;
    
    try {
      if (navigator.share) {
        console.log("Using native share API");
        await navigator.share({
          title: script?.title || "Shared Script",
          text: "Check out this script!",
          url: url,
        });
        console.log("Successfully shared");
      } else {
        console.log("Falling back to clipboard copy");
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard!");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to share';
      console.error("Error sharing:", {
        error,
        message: errorMessage,
        url
      });
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-800 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-neutral-800 rounded w-1/3 mb-4"></div>
          <div className="h-40 bg-neutral-800 rounded mb-4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-red-400">Error</h1>
        <p className="mt-2 text-slate-300">{error}</p>
      </div>
    );
  }

  if (!script) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-red-400">Script not found</h1>
        <p className="mt-2 text-slate-300">The requested script could not be found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Link 
        href="/" 
        className="inline-block mb-4 px-4 py-2 text-sm font-medium text-amber-300 bg-neutral-800/80 rounded-md hover:bg-neutral-700/80 transition-colors"
      >
        ← Back to Home
      </Link>
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-amber-300">{script.title}</h1>
              <p className="text-slate-400">
                by {script.owner?.username || "Anonymous"} •{" "}
                {new Date(script.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={handleShare}
              className="bg-gradient-to-tr from-amber-300 to-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg hover:brightness-110 transition-colors"
            >
              Share
            </button>
          </div>
          
          <div className="bg-zinc-900/90 rounded-lg shadow-2xl overflow-hidden">
            <div className="w-full h-[calc(100vh-4rem)] relative">
              <Editor
                height="100%"
                defaultLanguage="typescript"
                value={content}
                onChange={handleEditorChange}
                options={monacoOptions}
                beforeMount={initializeTheme}
                theme="brillance-black"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 