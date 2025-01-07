'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { StarIcon, ArrowDownTrayIcon, CheckBadgeIcon } from '@heroicons/react/24/outline'
import { ScriptsResponse } from '@/types/script'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

interface ScriptListMobileProps {
  initialData: ScriptsResponse
}

export default function ScriptListMobile({ initialData }: ScriptListMobileProps) {
  const searchParams = useSearchParams()
  const page = Number(searchParams?.get('page')) || 1
  const totalPages = initialData.totalPages

  const getPageUrl = (pageNum: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.set('page', pageNum.toString())
    return `/?${params.toString()}`
  }

  const generatePaginationItems = () => {
    const items = []
    const maxVisible = 5
    const start = Math.max(
      1,
      Math.min(page - Math.floor(maxVisible / 2), totalPages - maxVisible + 1)
    )
    const end = Math.min(totalPages, start + maxVisible - 1)

    for (let i = start; i <= end; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink href={getPageUrl(i)} isActive={page === i}>
            {i}
          </PaginationLink>
        </PaginationItem>
      )
    }

    return items
  }

  return (
    <div className="">
      {/* Script List */}
      <div className="divide-y divide-border overflow-hidden">
        {initialData.scripts.map(script => (
          <Link
            key={script.id}
            href={`/${script.owner?.username}/${script.id}`}
            className="block p-4 hover:bg-zinc-800/50 transition-colors"
          >
            <h3 className="text-lg font-semibold text-gray-200">{script.title}</h3>
            <p className="text-sm text-amber-400 mt-1">
              by {script.owner?.username || 'Anonymous'}
            </p>
            {script.summary && (
              <p className="text-gray-400 mt-2 text-sm line-clamp-2">{script.summary}</p>
            )}
            {/* Stats Row */}
            <div className="flex gap-4 mt-3 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>{script._count.installs}</span>
              </div>
              <div className="flex items-center gap-1">
                <StarIcon className="h-4 w-4" />
                <span>{script._count.favorites}</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckBadgeIcon className="h-4 w-4" />
                <span>{script._count.verifications}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-8 flex flex-col items-center gap-2">
        <div className="text-sm text-muted-foreground">
          Page {page} of {totalPages} • {initialData.scripts.length} items per page
        </div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={getPageUrl(page - 1)}
                aria-disabled={page <= 1}
                className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>

            {generatePaginationItems()}

            <PaginationItem>
              <PaginationNext
                href={getPageUrl(page + 1)}
                aria-disabled={page >= totalPages}
                className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}
