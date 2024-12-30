'use client'
import { ClipboardIcon } from '@heroicons/react/24/solid'

export default function CopyButtonClient({ content }: { content: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(content)
  }

  return (
    <button
      onClick={handleCopy}
      className="text-slate-400 hover:text-amber-300 transition-colors group relative flex items-center h-5"
      title="Copy script"
    >
      <ClipboardIcon className="w-5 h-5" />
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-sm text-slate-200 opacity-0 transition before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-black before:content-[''] group-hover:opacity-100">
        Copy to clipboard
      </span>
    </button>
  )
}
