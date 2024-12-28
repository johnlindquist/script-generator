import NextAuth, { DefaultSession, AuthOptions } from "next-auth"
import GithubProvider from "next-auth/providers/github"
import { prisma } from "@/lib/prisma"

// Extend the built-in session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      githubId: string
    } & DefaultSession["user"]
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
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account }) {
      try {
        if (account?.provider === "github") {
          console.log("GitHub sign in:", { 
            user, 
            providerAccountId: account.providerAccountId 
          })
          
          if (!account.providerAccountId) {
            console.error("No providerAccountId found in GitHub account")
            return false
          }

          const githubId = account.providerAccountId
          const username = user.name || user.email?.split("@")[0] || "user"

          // Create or update user in database
          const dbUser = await prisma.user.upsert({
            where: { githubId },
            update: { username },
            create: {
              githubId,
              username,
            },
          })

          console.log("User upserted:", { dbUser })
          
          if (!dbUser) {
            console.error("Failed to upsert user")
            return false
          }

          return true
        }
        return true
      } catch (error) {
        console.error("Error in signIn callback:", error)
        return false
      }
    },
    async jwt({ token, account, profile }) {
      console.log("JWT callback:", { token, account, profile })
      
      if (account) {
        // Store the provider account id in the token
        token.sub = account.providerAccountId
        
        // Find user in database and store ID in token
        const dbUser = await prisma.user.findUnique({
          where: { githubId: account.providerAccountId }
        })
        
        if (dbUser) {
          token.userId = dbUser.id
          token.githubId = dbUser.githubId
        }
      }
      return token
    },
    async session({ session, token }) {
      console.log("Session callback:", { session, token })
      
      if (token.userId && token.githubId) {
        session.user.id = token.userId as string
        session.user.githubId = token.githubId as string
        console.log("Updated session with user data:", { 
          id: session.user.id, 
          githubId: session.user.githubId 
        })
      } else {
        console.error("No user ID or GitHub ID in token:", { token })
      }

      return session
    }
  },
  debug: process.env.NODE_ENV === 'development',
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST } 