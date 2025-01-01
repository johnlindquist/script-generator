import NextAuth, { DefaultSession, AuthOptions } from 'next-auth'
import GithubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'

// Extend the built-in session type
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      githubId: string
    } & DefaultSession['user']
  }
}

// Test user details
const TEST_USER = {
  id: 'test-user-id',
  githubId: 'test-user-id',
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
          where: { githubId: TEST_USER.githubId },
          update: { username: TEST_USER.username },
          create: {
            githubId: TEST_USER.githubId,
            username: TEST_USER.username,
          },
        })

        return {
          id: user.id,
          githubId: user.githubId,
          name: TEST_USER.name,
          email: TEST_USER.email,
          image: TEST_USER.image,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.githubId = user.githubId
      }
      return token
    },
    async session({ session, token }) {
      if (token.userId && token.githubId) {
        session.user.id = token.userId as string
        session.user.githubId = token.githubId as string
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
