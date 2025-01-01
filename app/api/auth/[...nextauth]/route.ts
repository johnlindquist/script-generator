import NextAuth, { DefaultSession, AuthOptions } from 'next-auth'
import GithubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'

// Extend the built-in session type
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
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
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
          username: profile.login,
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
          update: { username: TEST_USER.username },
          create: {
            id: TEST_USER.id,
            username: TEST_USER.username,
          },
        })

        return {
          id: user.id,
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
      }
      return token
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string
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
