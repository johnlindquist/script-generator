import Link from 'next/link'
import { StarIcon } from '@heroicons/react/24/solid'

export default function SponsorRibbon() {
  return (
    <div className="absolute left-0 top-0 h-32 w-64 overflow-hidden z-10">
      <div className="absolute -left-4 top-10 -translate-x-8 -rotate-[30deg]">
        {/* Ribbon */}
        <div className="relative z-10 w-72 bg-amber-300/70 py-1 text-center shadow-lg">
          <Link
            href="https://github.com/sponsors/johnlindquist/sponsorships?sponsor=johnlindquist&tier_id=235205"
            className="inline-flex items-center justify-center gap-1 text-sm font-bold text-black/90"
          >
            <StarIcon className="h-3 w-3" />
            Thanks to Our Sponsors!
            <StarIcon className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}
