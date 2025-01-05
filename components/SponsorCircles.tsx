'use client'

import { useEffect, useState } from 'react'
import StarIcon from './StarIcon'
import { Position, Sponsor } from '@/types/sponsor'

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

function getRandomRotation() {
  return Math.random() * 90 - 45
}

// Shuffle array using Fisher-Yates algorithm
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array]
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  }
  return newArray
}

export function SponsorCircles({ sponsors }: { sponsors: Sponsor[] }) {
  const [positions, setPositions] = useState<Position[]>([])
  const [rotations, setRotations] = useState<number[]>([])
  const [delays, setDelays] = useState<number[]>([])
  const [shuffledSponsors, setShuffledSponsors] = useState<Sponsor[]>([])
  const [isClient, setIsClient] = useState(false)
  const [loadedStars, setLoadedStars] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Shuffle sponsors for random appearance
    const shuffled = shuffleArray(sponsors)
    setShuffledSponsors(shuffled)

    // Calculate all positions at once
    const newPositions: Position[] = []
    const newRotations: number[] = []
    const newDelays: number[] = []

    shuffled.forEach((_, index) => {
      const pos = getGridPosition(index, shuffled.length, newPositions)
      newPositions.push(pos)
      newRotations.push(getRandomRotation())
      // Random delay between 0 and 1000ms
      newDelays.push(Math.random() * 1000)
    })

    setPositions(newPositions)
    setRotations(newRotations)
    setDelays(newDelays)
    setIsClient(true)
  }, [sponsors])

  const handleStarLoad = (login: string) => {
    setLoadedStars(prev => new Set([...prev, login]))
  }

  if (!isClient) return null

  return (
    <>
      {shuffledSponsors.map((sponsor, index) => {
        const position = positions[index]
        const rotation = rotations[index]
        const delay = delays[index]
        if (!position) return null
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
              onLoad={() => handleStarLoad(sponsor.login)}
              isLoaded={loadedStars.has(sponsor.login)}
              delay={delay}
            />
          </div>
        )
      })}
    </>
  )
}
