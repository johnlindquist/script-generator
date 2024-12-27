import { useEffect, useState } from "react";

const SUGGESTIONS = [
  "Clean up temporary files in a directory",
  "Convert CSV to JSON",
  "Resize all images in a folder",
  "Extract audio from a video",
  "Search for duplicated lines in a file",
  "Archive old log files",
  "Parse and validate JSON data",
  "Detect and remove unused npm packages",
  "Encrypt a file before uploading",
  "Check for broken symbolic links",
  "Generate a random password",
  "Compare two directories for differences",
  "Fetch and display latest weather info",
  "Generate an MD5 checksum of a file",
  "Merge multiple PDF files"
  // Added a subset for initial implementation
];

interface ScriptSuggestionsProps {
  setPrompt: (prompt: string) => void;
}

export default function ScriptSuggestions({ setPrompt }: ScriptSuggestionsProps) {
  const [randomSuggestions, setRandomSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const randomCount = Math.floor(Math.random() * 2) + 3; // 3 to 4 suggestions
    const shuffled = [...SUGGESTIONS]
      .sort(() => 0.5 - Math.random())
      .slice(0, randomCount);
    setRandomSuggestions(shuffled);
  }, []);

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {randomSuggestions.map((suggestion, idx) => (
        <button
          key={idx}
          onClick={() => setPrompt(suggestion)}
          className="text-sm bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full transition-colors duration-200"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
} 