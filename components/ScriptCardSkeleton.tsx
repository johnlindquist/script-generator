import { Skeleton } from '@/components/ui/skeleton'

export default function ScriptCardSkeleton() {
  return (
    <article className="w-full border rounded sm:p-5 p-3 shadow-2xl flex flex-col break-inside transition-colors bg-card h-[500px]">
      <div className="mb-4 flex-shrink-0">
        <Skeleton className="h-7 w-3/4 mb-2" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <Skeleton className="h-full w-full" />
      </div>
      <div className="flex justify-between items-start gap-y-4 pt-5 flex-shrink-0">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </article>
  )
}
