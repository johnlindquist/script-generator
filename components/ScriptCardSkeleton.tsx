export default function ScriptCardSkeleton() {
  return (
    <div className="border border-neutral-700 rounded-lg px-6 py-4 shadow-2xl flex flex-col h-[500px] break-inside animate-pulse bg-zinc-900/90">
      {/* Title skeleton */}
      <div className="h-7 bg-zinc-800 rounded w-3/4 mb-2" />

      {/* Username skeleton */}
      <div className="h-4 bg-zinc-800 rounded w-1/3 mb-4" />

      {/* Code block skeleton */}
      <div className="flex-1 bg-zinc-800 rounded mb-4" />

      {/* Action buttons skeleton */}
      <div className="flex justify-between items-center mt-auto">
        <div className="flex gap-2">
          <div className="h-8 w-20 bg-zinc-800 rounded" />
          <div className="h-8 w-20 bg-zinc-800 rounded" />
        </div>
        <div className="h-8 w-20 bg-zinc-800 rounded" />
      </div>
    </div>
  )
}
