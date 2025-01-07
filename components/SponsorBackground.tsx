import { StarIcon as HeroStarIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { SponsorCircles } from './SponsorCircles'
import { headers } from 'next/headers'

interface GitHubSponsor {
  __typename: string
  login: string
  id: string
  databaseId: number
}

async function getSponsors(): Promise<GitHubSponsor[]> {
  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'

    const res = await fetch(`${protocol}://${host}/api/get-all-sponsors`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) {
      return []
    }
    return res.json()
  } catch (error) {
    console.error('Error fetching sponsors:', error)
    return []
  }
}

// Server component
export default async function SponsorBackground() {
  const sponsors = await getSponsors()

  return (
    <>
      {/* Sponsor Ribbon */}
      <div className="absolute left-0 top-0 h-32 w-72 overflow-hidden hidden xl:block pointer-events-none">
        <div className="absolute -left-4 top-10 -translate-x-8 -rotate-[30deg]">
          <div className="relative z-[200] w-72 bg-primary/90 hover:bg-primary/100 py-1 text-center shadow-sm shadow-primary/80 hover:shadow-md hover:shadow-primary/80 pointer-events-auto">
            <Link
              href="https://github.com/sponsors/johnlindquist/sponsorships?sponsor=johnlindquist&tier_id=235205"
              className="inline-flex items-center justify-center gap-1 text-sm font-bold text-black/90"
            >
              <HeroStarIcon className="h-3 w-3" />
              Thanks to Our Sponsors!
              <HeroStarIcon className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Background container with gradient */}
      <div
        className="absolute inset-0 border-y overflow-hidden hidden md:block"
        style={{ zIndex: -1 }}
      >
        {/* Radial gradient overlay for center fade-out effect */}
        <div className="gradient-overlay" />
        <SponsorCircles sponsors={sponsors} />
        <div className="absolute inset-0 pointer-events-none w-full h-full bg-gradient-to-r from-transparent via-background to-transparent z-50" />
      </div>
    </>
  )
}
