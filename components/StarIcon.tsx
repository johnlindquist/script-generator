import Image from 'next/image'
import { useInView } from 'react-intersection-observer'
import { motion } from 'framer-motion'
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
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const displayName = fullName || username || login

  return (
    <div
      ref={ref}
      className="group relative opacity-transition"
      style={{
        opacity: isLoaded && inView ? opacity : 0,
        transitionDelay: `${delay}ms`,
      }}
    >
      <Tooltip
        content={<span className="text-xs">Thank you {displayName}!</span>}
        delay={300}
        closeDelay={0}
        classNames={{
          content: ['bg-black/90'],
        }}
      >
        <motion.div
          className="relative w-7 h-7"
          initial={{ rotate: rotation }}
          whileHover={{
            rotate: 0,
            scale: 1.25,
            opacity: 1,
          }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
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
        </motion.div>
      </Tooltip>
    </div>
  )
}
