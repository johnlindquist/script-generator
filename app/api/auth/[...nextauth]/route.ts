import NextAuth, { DefaultSession } from "next-auth"
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

const handler = NextAuth({
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
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "github") {
        console.log("GitHub sign in:", { 
          user, 
          providerAccountId: account.providerAccountId 
        })
        
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
      }
      return true
    },
    async session({ session, token }) {
      console.log("Session callback:", { session, token })
      
      if (token.sub) {
        // Find user in database
        const dbUser = await prisma.user.findUnique({
          where: { githubId: token.sub }
        })

        if (dbUser) {
          // Add database user ID and GitHub ID to session
          session.user = {
            ...session.user,
            id: dbUser.id,
            githubId: dbUser.githubId
          }
          console.log("Updated session with user data:", { 
            id: dbUser.id, 
            githubId: dbUser.githubId 
          })
        } else {
          console.error("User not found in database during session callback:", { 
            tokenSub: token.sub 
          })
        }
      } else {
        console.error("No sub in token during session callback:", { token })
      }

      return session
    },
    async jwt({ token, account, profile }) {
      console.log("JWT callback:", { token, account, profile })
      
      if (account) {
        // Store the provider account id in the token
        token.sub = account.providerAccountId
      }
      return token
    }
  },
  debug: process.env.NODE_ENV === 'development',
})

export { handler as GET, handler as POST } 