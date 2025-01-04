'use client'

import { useEffect, useState } from 'react'
import { StarIcon } from '@heroicons/react/24/solid'
import Image from 'next/image'

interface User {
  username: string | null
  fullName: string | null
}

interface Sponsor {
  login: string
  user: User | null
}

interface ApiError {
  error: string
  requestId: string
}

export default function SponsorsWall() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [error, setError] = useState<ApiError | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchSponsors() {
      try {
        const res = await fetch('/api/get-all-sponsors')
        const data = await res.json()

        if (!res.ok) {
          throw new Error(JSON.stringify(data))
        }

        setSponsors(data)
      } catch (err) {
        console.error('Error fetching sponsors:', err)
        try {
          // Try to parse the error as an API error
          const apiError =
            err instanceof Error ? JSON.parse(err.message) : { error: 'Unknown error' }
          setError(apiError)
        } catch {
          // If parsing fails, it's not an API error
          setError({
            error: err instanceof Error ? err.message : 'Unknown error',
            requestId: 'client-error',
          })
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchSponsors()
  }, [])

  if (error) {
    return (
      <div className="text-center text-red-500">
        <p>Failed to load sponsors: {error.error}</p>
        <p className="text-xs text-zinc-400 mt-2">Request ID: {error.requestId}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center text-zinc-400">
        <p>Loading sponsors...</p>
      </div>
    )
  }

  if (!sponsors.length) {
    return (
      <div className="text-center text-zinc-400">
        <p>No sponsors found</p>
        <div className="mt-8">
          <a
            href="https://github.com/sponsors/johnlindquist"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors"
          >
            <StarIcon className="w-5 h-5" />
            <span>Become a Sponsor</span>
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center max-w-4xl mx-auto px-4">
      <h2 className="text-2xl font-bold text-white mb-2">Our Amazing Sponsors</h2>
      <p className="text-amber-400 mb-8 text-center max-w-xl">
        Thank you to our incredible sponsors who make this project possible! Your support helps us
        continue building and improving Script Kit.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 justify-items-center">
        {sponsors.map(sponsor => (
          <a
            key={sponsor.login}
            href={`https://github.com/${sponsor.login}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative w-20 h-20 flex items-center justify-center transition-transform hover:scale-110"
            title={sponsor.user?.fullName || sponsor.user?.username || sponsor.login}
          >
            {/* Star background */}
            <div className="absolute inset-0 bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
              <StarIcon className="w-20 h-20 text-amber-500/20 group-hover:text-amber-500/30 transition-colors" />
            </div>

            {/* Circular avatar */}
            <Image
              src={`https://github.com/${sponsor.login}.png`}
              alt={`${sponsor.user?.fullName || sponsor.user?.username || sponsor.login} avatar`}
              width={64}
              height={64}
              className="relative rounded-full border-2 border-amber-500/50 group-hover:border-amber-500 transition-colors object-cover"
            />
          </a>
        ))}
      </div>

      <div className="mt-8 text-center">
        <a
          href="https://github.com/sponsors/johnlindquist"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors"
        >
          <StarIcon className="w-5 h-5" />
          <span>Become a Sponsor</span>
        </a>
      </div>
    </div>
  )
}
