'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import ScriptGridWithSuspense from './ScriptGridWithSuspense'
import { ScriptsResponse } from '@/types/script'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination'

interface ScriptListClientProps {
  isAuthenticated: boolean
  currentUserId?: string
  initialData: ScriptsResponse
}

export default function ScriptListClient({
  isAuthenticated,
  currentUserId,
  initialData,
}: ScriptListClientProps) {
  const searchParams = useSearchParams()
  const page = Number(searchParams?.get('page') ?? '1')
  const [totalPages] = useState(initialData.totalPages)

  const getPageUrl = (pageNum: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.set('page', pageNum.toString())
    return `/?${params.toString()}`
  }

  const generatePaginationItems = () => {
    const items = []
    const maxVisible = 5 // Maximum number of page numbers to show
    const halfVisible = Math.floor(maxVisible / 2)

    let start = Math.max(1, page - halfVisible)
    let end = Math.min(totalPages, start + maxVisible - 1)

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }

    // First page
    if (start > 1) {
      items.push(
        <PaginationItem key="1">
          <PaginationLink href={getPageUrl(1)}>1</PaginationLink>
        </PaginationItem>
      )
      if (start > 2) {
        items.push(
          <PaginationItem key="start-ellipsis">
            <PaginationEllipsis />
          </PaginationItem>
        )
      }
    }

    // Page numbers
    for (let i = start; i <= end; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink href={getPageUrl(i)} isActive={page === i}>
            {i}
          </PaginationLink>
        </PaginationItem>
      )
    }

    // Last page
    if (end < totalPages) {
      if (end < totalPages - 1) {
        items.push(
          <PaginationItem key="end-ellipsis">
            <PaginationEllipsis />
          </PaginationItem>
        )
      }
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink href={getPageUrl(totalPages)}>{totalPages}</PaginationLink>
        </PaginationItem>
      )
    }

    return items
  }

  return (
    <div>
      <ScriptGridWithSuspense
        scripts={initialData.scripts}
        totalPages={totalPages}
        page={page}
        isAuthenticated={isAuthenticated}
        currentUserId={currentUserId}
        fallbackData={initialData}
      />

      <div className="mt-8 flex flex-col items-center gap-2">
        <div className="text-sm text-muted-foreground">
          Showing page {page} of {totalPages} • {initialData.scripts.length} items per page
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
