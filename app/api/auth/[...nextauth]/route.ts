import NextAuth, { DefaultSession, AuthOptions } from 'next-auth'
import GithubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'

// Extend the built-in types
declare module 'next-auth' {
  interface Profile {
    login: string
    name?: string | undefined
    email?: string | undefined
    avatar_url?: string
  }

  interface User {
    id: string
    username: string
    fullName?: string | null
    email?: string | null
    image?: string | null
  }

  interface Session {
    user: {
      id: string
      username: string
      fullName?: string | null
    } & DefaultSession['user']
  }
}

// Test user details
const TEST_USER = {
  id: 'test-user-id',
  username: 'test',
  name: 'Test User',
  email: 'test@example.com',
  image: 'https://avatars.githubusercontent.com/u/99999999?v=4',
}

export const authOptions: AuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email',
        },
      },
      profile(profile) {
        return {
          id: profile.id.toString(),
          githubId: profile.id.toString(),
          username: profile.login,
          fullName: profile.name || null,
          email: profile.email,
          image: profile.avatar_url,
        }
      },
    }),
    CredentialsProvider({
      id: 'credentials',
      name: 'Test Account',
      credentials: {
        username: { type: 'text' },
        isTest: { type: 'boolean' },
      },
      async authorize(credentials) {
        if (process.env.NODE_ENV !== 'development' || !credentials?.isTest) {
          return null
        }

        // Create or update test user in DB
        const user = await prisma.user.upsert({
          where: { id: TEST_USER.id },
          update: {
            username: TEST_USER.username,
            fullName: TEST_USER.name,
          },
          create: {
            id: TEST_USER.id,
            username: TEST_USER.username,
            fullName: TEST_USER.name,
          },
        })

        return {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: TEST_USER.email,
          image: TEST_USER.image,
          githubId: TEST_USER.id,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'github' && profile) {
        // Ensure we update the user in our database with latest GitHub info
        await prisma.user.upsert({
          where: { id: user.id },
          update: {
            username: profile.login as string,
            fullName: profile.name || null,
          },
          create: {
            id: user.id,
            username: profile.login as string,
            fullName: profile.name || null,
          },
        })
      }
      return true
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.userId = user.id
        token.username = user.username
        token.fullName = user.fullName ?? null
      }
      // If it's a GitHub sign in, ensure we have latest profile info
      if (account?.provider === 'github' && profile) {
        token.username = profile.login as string
        token.fullName = profile.name || null
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId
        session.user.username = token.username
        session.user.fullName = token.fullName ?? null
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === 'development',
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
