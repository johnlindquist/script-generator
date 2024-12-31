import NextAuth, { DefaultSession, AuthOptions } from 'next-auth'
import GithubProvider from 'next-auth/providers/github'
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
  ],
  pages: {
    signIn: '/auth/signin',
  },
  ...(process.env.AUTH_REDIRECT_PROXY_URL
    ? {
        callbacks: {
          async redirect({ url }) {
            const finalUrl = url.replace(
              process.env.AUTH_REDIRECT_PROXY_URL!,
              process.env.NEXTAUTH_URL!
            )
            return finalUrl
          },
        },
      }
    : {}),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) {
        return url
      }

      // Handle relative URLs
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`
      }

      const allowedDomains = [
        'scriptkit.com',
        'dev-scriptkit.vercel.app',
        'staging-scriptkit.vercel.app',
        `localhost:${process.env.PORT || 3000}`,
        'script-generator-git-main-skillrecordings.vercel.app',
        'script-generator-*.vercel.app',
      ]

      try {
        const urlObj = new URL(url)
        const host = urlObj.host.replace(/^(https?:\/\/)?(www\.)?/, '')

        const isAllowedDomain = allowedDomains.some(domain => {
          if (domain.includes('*')) {
            const pattern = domain.replace('*', '.*')
            return new RegExp(`^${pattern}$`).test(host)
          }
          return domain === host
        })

        if (isAllowedDomain) {
          return url
        }
      } catch (error) {
        console.error('Error parsing URL:', error)
      }

      return baseUrl
    },
    async signIn({ user, account }) {
      if (account?.provider !== 'github') {
        console.error('Only GitHub authentication is supported')
        return false
      }

      try {
        console.log('GitHub sign in:', {
          user,
          providerAccountId: account.providerAccountId,
        })

        if (!account.providerAccountId) {
          console.error('No providerAccountId found in GitHub account')
          return false
        }

        const githubId = account.providerAccountId
        const username = user.name || user.email?.split('@')[0] || 'user'

        // Create or update user in database with a new Prisma instance
        const dbUser = await prisma.$transaction(async tx => {
          return await tx.user.upsert({
            where: { githubId },
            update: { username },
            create: {
              githubId,
              username,
            },
          })
        })

        console.log('User upserted:', { dbUser })

        if (!dbUser) {
          console.error('Failed to upsert user')
          return false
        }

        return true
      } catch (error) {
        console.error('Error in signIn callback:', error)
        // Disconnect Prisma client on error
        await prisma.$disconnect()
        return false
      }
    },
    async jwt({ token, account, profile }) {
      console.log('JWT callback:', { token, account, profile })

      if (account) {
        token.sub = account.providerAccountId

        try {
          const dbUser = await prisma.user.findUnique({
            where: { githubId: account.providerAccountId },
          })

          if (dbUser) {
            token.userId = dbUser.id
            token.githubId = dbUser.githubId
          }
        } catch (error) {
          console.error('Error in jwt callback:', error)
          await prisma.$disconnect()
        }
      }
      return token
    },
    async session({ session, token }) {
      console.log('Session callback:', { session, token })

      if (token.userId && token.githubId) {
        session.user.id = token.userId as string
        session.user.githubId = token.githubId as string
        console.log('Updated session with user data:', {
          id: session.user.id,
          githubId: session.user.githubId,
        })
      } else {
        console.error('No user ID or GitHub ID in token:', { token })
      }

      return session
    },
  },
  debug: process.env.NODE_ENV === 'development',
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
