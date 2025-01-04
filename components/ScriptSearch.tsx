'use client'

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useTransition, useState } from 'react'

export default function ScriptSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchTerm, setSearchTerm] = useState(searchParams?.get('query') ?? '')

  const updateSearch = useCallback(
    (term: string) => {
      console.log('🔍 Initiating search:', { term, source: 'updateSearch' })
      const params = new URLSearchParams(searchParams?.toString() ?? '')
      if (term) {
        params.set('query', term)
        params.set('page', '1')
      } else {
        params.delete('query')
      }
      const url = `/?${params.toString()}`
      console.log('🔍 Navigating to:', { url })
      startTransition(() => {
        router.replace(url, { scroll: false })
      })
    },
    [router, searchParams]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🔍 Form submitted:', { searchTerm })
    updateSearch(searchTerm)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon
            className={`h-5 w-5 ${isPending ? 'text-amber-400/80' : 'text-zinc-400'}`}
            aria-hidden="true"
          />
        </div>
        <input
          type="search"
          className="block w-full pl-10 pr-24 py-2 border border-zinc-700 rounded-md leading-5 bg-zinc-900/50 text-zinc-100 placeholder-zinc-400 focus:outline-none focus:bg-zinc-900 focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/50 sm:text-sm"
          placeholder="Search scripts..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-2">
          <button
            type="submit"
            className="px-3 py-1 bg-amber-400/20 text-amber-400 rounded-md hover:bg-amber-400/30 focus:outline-none focus:ring-2 focus:ring-amber-400/50 disabled:opacity-50 transition-colors text-sm"
            disabled={isPending}
          >
            {isPending ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>
    </form>
  )
}
