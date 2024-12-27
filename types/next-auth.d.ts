import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      githubId: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
  
  interface User {
    id: string
    githubId: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
} 