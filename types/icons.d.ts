// Icon module stubs for compilation-only purposes.

// Heroicons v2 – outline & solid (tree-shaken SVG React components)
declare module '@heroicons/react/24/outline' {
  import { FC, SVGProps } from 'react'
  export const LockClosedIcon: FC<SVGProps<SVGSVGElement>>
  export const StarIcon: FC<SVGProps<SVGSVGElement>>
  export const ArrowDownTrayIcon: FC<SVGProps<SVGSVGElement>>
  export const CheckBadgeIcon: FC<SVGProps<SVGSVGElement>>
  export const ShieldCheckIcon: FC<SVGProps<SVGSVGElement>>
  export const Squares2X2Icon: FC<SVGProps<SVGSVGElement>>
  export const ListBulletIcon: FC<SVGProps<SVGSVGElement>>
}

declare module '@heroicons/react/24/solid' {
  import { FC, SVGProps } from 'react'
  export const StarIcon: FC<SVGProps<SVGSVGElement>>
}

// React Icons FA subset used in the project
declare module 'react-icons/fa' {
  import { FC, SVGProps } from 'react'
  export const FaGithub: FC<SVGProps<SVGSVGElement>>
}