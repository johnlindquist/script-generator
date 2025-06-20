// Next.js helper & component stubs for environments where @types/next-* are absent.

// -----------------------------------------------------------------------------
// next/navigation – only what the codebase uses (notFound & redirect)
// -----------------------------------------------------------------------------
declare module 'next/navigation' {
  /** Throws a Next.js 404 boundary */
  export function notFound(): never
  /** Programmatic navigation */
  export function redirect(url: string): never
}

// -----------------------------------------------------------------------------
// next/link – typed minimal functional component
// -----------------------------------------------------------------------------

declare module 'next/link' {
  import { FC, ReactNode } from 'react'

  export interface LinkProps {
    href: string | { pathname: string; query?: Record<string, unknown> }
    prefetch?: boolean
    className?: string
    children?: ReactNode
  }

  const Link: FC<LinkProps>
  export default Link
}

// -----------------------------------------------------------------------------
// next/image – typed minimal functional component
// -----------------------------------------------------------------------------

declare module 'next/image' {
  import { FC } from 'react'

  export interface ImageProps {
    src: string
    alt: string
    width?: number
    height?: number
    className?: string
    priority?: boolean
    placeholder?: 'blur' | 'empty'
  }

  const Image: FC<ImageProps>
  export default Image
}

// -----------------------------------------------------------------------------
// next – bare-bones API types required for getServerSession overload
// -----------------------------------------------------------------------------

declare module 'next' {
  export interface NextApiRequest {
    headers: Record<string, string | string[] | undefined>
    query: Record<string, string | string[]>
    body?: unknown
    method?: string
  }

  export interface NextApiResponse<T = unknown> {
    status: (code: number) => NextApiResponse<T>
    json: (data: T) => void
    end: (data?: string) => void
  }
}