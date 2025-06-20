declare module 'prism-react-renderer' {
  import { FC, CSSProperties, ReactElement } from 'react'

  export type Language =
    | 'markup'
    | 'bash'
    | 'clike'
    | 'c'
    | 'cpp'
    | 'css'
    | 'javascript'
    | 'jsx'
    | 'coffeescript'
    | 'actionscript'
    | 'css-extr'
    | 'diff'
    | 'git'
    | 'go'
    | 'graphql'
    | 'handlebars'
    | 'json'
    | 'less'
    | 'makefile'
    | 'markdown'
    | 'objectivec'
    | 'ocaml'
    | 'python'
    | 'reason'
    | 'sass'
    | 'scss'
    | 'sql'
    | 'stylus'
    | 'tsx'
    | 'typescript'
    | 'wasm'
    | 'yaml'

  export interface HighlightProps {
    code: string
    language: Language
    theme?: unknown
    children: (props: unknown) => ReactElement
  }

  const Highlight: (props: HighlightProps) => ReactElement
  export const themes: unknown
  export default Highlight
}

declare module '@heroicons/react/24/outline'
declare module '@heroicons/react/24/solid'
declare module 'react-icons/fa'

declare module 'next/navigation' {
  export function notFound(): never
}

declare module 'next/link' {
  import { FC, ReactElement } from 'react'

  type Url = string | { pathname: string; query?: Record<string, unknown> } | { href: string }

  export interface LinkProps {
    href: Url
    children?: ReactElement | ReactElement[] | string
    className?: string
    prefetch?: boolean
  }

  const Link: FC<LinkProps>
  export default Link
}

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

// ---------------------------------------------------------------------------
// Prisma rich stub (models we actually use)
// ---------------------------------------------------------------------------

declare module '@prisma/client' {
  /** Basic model interfaces used in the app */
  export interface User {
    id: string
    username: string
    fullName: string | null
    sponsorship?: unknown
  }

  export interface Script {
    id: string
    title: string
    content: string
    ownerId: string
    dashedName?: string
    locked: boolean
    owner?: User
    _count?: {
      verifications: number
      favorites: number
      installs: number
    }
  }

  /** Simplified PrismaClient containing only the queries we call in server components */
  export class PrismaClient {
    user: {
      findUnique: (args: unknown) => Promise<User | null>
    }
    script: {
      findFirst: (args: unknown) => Promise<Script | null>
    }
  }

  /** Generic helpers aliased to the model interfaces for convenience */
  export namespace Prisma {
    export type UserGetPayload<T extends object> = User
    export type ScriptGetPayload<T extends object> = Script
  }

  // Re-export so `import { prisma } from '@/lib/prisma'` continues to work in stubbed env.
  export const PrismaClientInstance: PrismaClient
}