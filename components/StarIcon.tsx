import Image from 'next/image'
import { Tooltip } from '@nextui-org/react'

interface StarIconProps {
  login: string
  fullName?: string | null
  username?: string | null
  rotation?: number
  opacity?: number
  onLoad?: () => void
  isLoaded?: boolean
  delay?: number
}

export default function StarIcon({
  login,
  fullName,
  username,
  rotation = 0,
  opacity = 0.6,
  onLoad,
  isLoaded = false,
  delay = 0,
}: StarIconProps) {
  const displayName = fullName || username || login

  return (
    <Tooltip
      content={<span className="text-xs">Thank you {displayName}!</span>}
      delay={0}
      closeDelay={0}
      classNames={{
        content: ['bg-black/90'],
      }}
    >
      <div
        className="opacity-transition"
        style={{
          transform: `rotate(${rotation}deg)`,
          opacity: isLoaded ? opacity : 0,
          transitionDelay: `${delay}ms`,
        }}
      >
        <div className="relative w-7 h-7">
          {/* Star background with masked avatar */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Masked avatar */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div>
                <Image
                  src={`https://avatars.githubusercontent.com/${login}?size=56`}
                  alt={`${displayName} avatar`}
                  fill
                  sizes="28px"
                  quality={95}
                  className="object-cover rounded-full"
                  onLoad={onLoad}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Tooltip>
  )
}
