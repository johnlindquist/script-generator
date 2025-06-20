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

declare module 'next-auth' {
  export interface Session {
    user?: unknown
  }
  export interface NextAuthOptions {
    [key: string]: unknown
  }
  export function getServerSession(options?: NextAuthOptions): Promise<Session | null>
}

declare module 'next/link' {
  import { FC, ReactElement } from 'react'
  import { UrlObject } from 'url'

  type Url = string | UrlObject

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
// Prisma (minimal typings sufficient for compilation)
// ---------------------------------------------------------------------------

declare module '@prisma/client' {
  export class PrismaClient {
    user: {
      findUnique: (...args: unknown[]) => Promise<unknown>
    }
    script: {
      findFirst: (...args: unknown[]) => Promise<unknown>
    }
  }

  export namespace Prisma {
    // Generic payload helpers – simplified to `unknown` while preserving generic arity
    export type UserGetPayload<T extends object> = unknown
    export type ScriptGetPayload<T extends object> = unknown
  }
}