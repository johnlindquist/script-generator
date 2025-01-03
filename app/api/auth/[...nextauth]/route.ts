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
        const existingUser = await prisma.user.findUnique({
          where: { username: TEST_USER.username },
        })

        if (existingUser) {
          const user = await prisma.user.update({
            where: { username: TEST_USER.username },
            data: {
              id: TEST_USER.id,
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
        }

        const user = await prisma.user.create({
          data: {
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
        try {
          // First try to find user by username
          const existingUser = await prisma.user.findUnique({
            where: { username: profile.login },
          })

          if (existingUser) {
            // Update existing user
            await prisma.user.update({
              where: { username: profile.login },
              data: {
                id: user.id,
                fullName: profile.name || null,
              },
            })
          } else {
            // Create new user
            await prisma.user.create({
              data: {
                id: user.id,
                username: profile.login,
                fullName: profile.name || null,
              },
            })
          }
          return true
        } catch (error) {
          console.error('Failed to update user:', error)
          return false
        }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = user.username
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.username = token.username as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 12 * 60 * 60, // 12 hours instead of 30 days
  },
  debug: process.env.NODE_ENV === 'development',
  events: {
    async signOut() {
      // Clean up any user-specific resources if needed
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
