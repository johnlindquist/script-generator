'use client'

import { useEffect, useState } from 'react'
import StarIcon from './StarIcon'
import Link from 'next/link'
import { StarIcon as HeroStarIcon } from '@heroicons/react/24/solid'

interface User {
  username: string | null
  fullName: string | null
}

interface Sponsor {
  login: string
  user: User | null
}

interface Position {
  x: number
  y: number
  opacity: number
}

function getRandomRotation() {
  return Math.random() * 90 - 45
}

// Calculate distance between two points
function getDistance(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}

// Check if a position would overlap with any existing positions
function wouldOverlap(x: number, y: number, existingPositions: Position[], minDistance: number) {
  return existingPositions.some(pos => {
    const distance = getDistance(x, y, pos.x, pos.y)
    return distance < minDistance
  })
}

function getGridPosition(index: number, total: number, existingPositions: Position[]): Position {
  // Try to find a non-overlapping position
  for (let attempt = 0; attempt < 30; attempt++) {
    // Get a random position anywhere in the grid
    const x = Math.random() * 100
    const y = Math.random() * 100

    // Calculate distance from center (in percentage points)
    const distanceFromCenter = Math.sqrt(Math.pow((x - 50) / 50, 2) + Math.pow((y - 50) / 50, 2))

    // Much higher chance of skipping positions not near the edges
    // Skip if not near edge (80% chance if not in outer 30%)
    if (Math.random() < 0.8 && distanceFromCenter < 0.7) {
      continue
    }

    // Use a smaller minimum distance to allow more natural clustering
    const minDistance = 8

    // Check if this position would overlap with any existing circles
    if (!wouldOverlap(x, y, existingPositions, minDistance)) {
      // Calculate opacity based on distance from center
      // More dramatic fade towards center
      const opacity = Math.min(0.7, Math.pow(distanceFromCenter, 1.5))
      return { x, y, opacity }
    }
  }

  // Fallback: place at a random edge position
  const angle = Math.random() * Math.PI * 2
  const radius = 0.85 + Math.random() * 0.1 // Place very close to edge
  const x = 50 + radius * 50 * Math.cos(angle)
  const y = 50 + radius * 50 * Math.sin(angle)

  const distanceFromCenter = Math.sqrt(Math.pow((x - 50) / 50, 2) + Math.pow((y - 50) / 50, 2))
  const opacity = Math.min(0.7, Math.pow(distanceFromCenter, 1.5))

  return { x, y, opacity }
}

export default function SponsorBackground() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchSponsors() {
      try {
        const res = await fetch('/api/get-all-sponsors')
        const data = await res.json()

        if (!res.ok) {
          throw new Error(JSON.stringify(data))
        }

        // Shuffle the sponsors array for more randomness in placement
        const shuffled = [...data].sort(() => Math.random() - 0.5)
        setSponsors(shuffled)

        // Calculate all positions at once
        const newPositions: Position[] = []
        shuffled.forEach((_, index) => {
          const pos = getGridPosition(index, shuffled.length, newPositions)
          newPositions.push(pos)
        })
        setPositions(newPositions)
      } catch (err) {
        console.error('Error fetching sponsors:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSponsors()
  }, [])

  if (isLoading || !sponsors.length) {
    return null
  }

  return (
    <>
      {/* Sponsor Ribbon */}
      <div className="absolute left-0 top-0 h-32 w-64 overflow-hidden z-10 hidden xl:block">
        <div className="absolute -left-4 top-10 -translate-x-8 -rotate-[30deg]">
          <div className="relative z-10 w-72 bg-amber-300/70 py-1 text-center shadow-lg">
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

      {/* Sponsor circles */}
      <div className="absolute inset-0 overflow-hidden hidden md:block" style={{ zIndex: 0 }}>
        {/* Radial gradient overlay for center fade-out effect */}
        <div className="gradient-overlay" />

        {sponsors.map((sponsor, index) => {
          const rotation = getRandomRotation()
          const position = positions[index]
          return (
            <div
              key={sponsor.login}
              className="absolute sponsor-circle"
              style={{
                top: `${position.y}%`,
                left: `${position.x}%`,
              }}
            >
              <StarIcon
                login={sponsor.login}
                fullName={sponsor.user?.fullName}
                username={sponsor.user?.username}
                rotation={rotation}
                opacity={position.opacity}
              />
            </div>
          )
        })}
      </div>
    </>
  )
}
