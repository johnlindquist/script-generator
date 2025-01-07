'use client'

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { Loader } from 'lucide-react'
import { useQueryState } from 'nuqs'
import { Input } from './ui/input'

export default function ScriptSearch() {
  const [query, setQuery] = useQueryState('query')
  const [page, setPage] = useQueryState('page')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await setPage('1') // Reset to first page when searching
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-zinc-400" aria-hidden="true" />
        </div>
        <Input
          className="pl-10 w-full"
          type="search"
          placeholder="Search scripts..."
          value={query ?? ''}
          onChange={async e => {
            await setQuery(e.target.value || null)
            await setPage('1')
          }}
        />
      </div>
    </form>
  )
}
