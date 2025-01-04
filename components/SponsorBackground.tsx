'use client'

import { useEffect, useState } from 'react'
import { StarIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

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
      {/* Sponsor circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -2 }}>
        {/* Radial gradient overlay for center fade-out effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, rgb(0, 0, 0) 40%, transparent 80%)',
            opacity: 0.98,
            zIndex: -1,
          }}
        />

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
                transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(1.5)`,
                opacity: position.opacity,
                willChange: 'transform',
                zIndex: -2,
              }}
            >
              <div className="relative w-7 h-7">
                {/* Star background with masked avatar */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Star outline */}
                  <StarIcon className="w-7 h-7 text-amber-500/90 stroke-[1.5]" />

                  {/* Masked avatar */}
                  <div className="absolute inset-0 [mask-image:url(#starMask)] [mask-size:100%] [mask-repeat:no-repeat] [mask-position:center] flex items-center justify-center translate-x-[1px] translate-y-[3px]">
                    <div className="relative w-full h-full transform translate-y-[2px]">
                      <Image
                        src={`https://github.com/${sponsor.login}.png`}
                        alt={`${sponsor.user?.fullName || sponsor.user?.username || sponsor.login} avatar`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SVG Mask Definition */}
              <svg className="absolute w-0 h-0">
                <defs>
                  <mask id="starMask">
                    <path
                      fill="white"
                      d="M11.4806 1.64832C11.7002 1.01547 12.5993 1.01547 12.8189 1.64832L14.8736 7.36674C14.9785 7.65852 15.2533 7.85843 15.5644 7.85843H21.5917C22.2657 7.85843 22.5481 8.72681 22.0038 9.13348L17.1884 12.8115C16.9376 12.9974 16.8334 13.3194 16.9384 13.6112L18.9931 19.3296C19.2127 19.9625 18.4706 20.4952 17.9262 20.0885L13.1108 16.4105C12.86 16.2246 12.5254 16.2246 12.2746 16.4105L7.45923 20.0885C6.91484 20.4952 6.17277 19.9625 6.39235 19.3296L8.44709 13.6112C8.55202 13.3194 8.44783 12.9974 8.19707 12.8115L3.38167 9.13348C2.83728 8.72681 3.11969 7.85843 3.79364 7.85843H9.82095C10.1321 7.85843 10.4069 7.65852 10.5118 7.36674L12.5666 1.64832Z"
                    />
                  </mask>
                </defs>
              </svg>
            </div>
          )
        })}
      </div>
    </>
  )
}
