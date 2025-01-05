import { StarIcon as HeroStarIcon } from '@heroicons/react/24/outline'
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
      content={`Thank you ${displayName}!`}
      delay={0}
      closeDelay={0}
      classNames={{
        content: ['bg-black/90'],
      }}
    >
      <div
        className="star-icon opacity-transition"
        style={{
          transform: `rotate(${rotation}deg)`,
          opacity: isLoaded ? opacity : 0,
          transitionDelay: `${delay}ms`,
        }}
      >
        <div className="relative w-7 h-7">
          {/* Star background with masked avatar */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Star outline */}
            <HeroStarIcon className="w-7 h-7 text-amber-500/90 stroke-[1.5]" />

            {/* Masked avatar */}
            <div className="absolute inset-0 [mask-image:url(#starMask)] [mask-size:100%] [mask-repeat:no-repeat] [mask-position:center] flex items-center justify-center translate-x-[1px] translate-y-[2px]">
              <div className="relative w-[90%] h-[90%] transform translate-y-[2px]">
                <Image
                  src={`https://github.com/${login}.png?size=56`}
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
    </Tooltip>
  )
}
