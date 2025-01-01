import { User } from '@prisma/client'
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: Pick<User, 'id' | 'username' | 'fullName'>
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string
    username: string
    fullName: string | null
  }
}
