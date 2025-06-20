import { User } from '@prisma/client'
import 'next-auth'
import { NextApiRequest, NextApiResponse } from 'next'

declare module 'next-auth' {
  /** Subset of the official NextAuth options sufficient for getServerSession overload */
  interface NextAuthOptions {
    providers?: unknown[]
    pages?: Record<string, unknown>
    callbacks?: Record<string, unknown>
    session?: Record<string, unknown>
    adapter?: unknown
  }

  interface Session {
    user: Pick<User, 'id' | 'username' | 'fullName'>
  }

  /**
   * Simplified overload for getServerSession used in the codebase
   * Either pass (req,res, options) in API route or just (options) in server components.
   */
  export function getServerSession(
    options?: NextAuthOptions
  ): Promise<Session | null>

  export function getServerSession(
    req: NextApiRequest,
    res: NextApiResponse,
    options: NextAuthOptions
  ): Promise<Session | null>
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string
    username: string
    fullName: string | null
  }
}
