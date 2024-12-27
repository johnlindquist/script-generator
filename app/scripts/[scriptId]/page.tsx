"use client";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { useEffect, useState, use } from "react";
import { toast } from "react-hot-toast";
import Link from "next/link";

interface ScriptPageProps {
  params: Promise<{ scriptId: string }>;
}

export default function ScriptPage({ params }: ScriptPageProps) {
  const { scriptId } = use(params);
  const [script, setScript] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-40 bg-gray-200 rounded mb-4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-red-500">Error</h1>
        <p className="mt-2 text-gray-600">{error}</p>
      </div>
    );
  }

  if (!script) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-red-500">Script not found</h1>
        <p className="mt-2 text-gray-600">The requested script could not be found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Link href="/" className="inline-block mb-4 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">
        ← Back to Home
      </Link>
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{script.title}</h1>
              <p className="text-gray-600">
                by {script.owner?.username || "Anonymous"} •{" "}
                {new Date(script.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={handleShare}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Share
            </button>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-6 shadow-sm">
            <pre className="overflow-x-auto whitespace-pre-wrap">
              <code className="text-sm">{script.content}</code>
            </pre>
          </div>
        </div>
      </main>
    </div>
  );
} 