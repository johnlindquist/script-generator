import NextAuth, { DefaultSession, AuthOptions } from 'next-auth'
import GithubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'

// Function to check if a single user is a sponsor
async function checkUserSponsorStatus(username: string) {
  try {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_SPONSORS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            user(login: "${process.env.GITHUB_SPONSORS_LOGIN}") {
              sponsorshipsAsMaintainer(first: 1, includePrivate: true, filter: {maintainer: "${process.env.GITHUB_SPONSORS_LOGIN}", sponsor: "${username}"}) {
                nodes {
                  sponsorEntity {
                    ... on User {
                      databaseId
                      login
                      id
                    }
                  }
                  tier {
                    isOneTime
                  }
                }
              }
            }
          }
        `,
      }),
    })

    const result = await response.json() as { data?: { user?: { sponsorshipsAsMaintainer?: { nodes?: Array<{ tier?: { isOneTime?: boolean }, sponsorEntity?: { login: string, id: string, databaseId: number } }> } } } }
    const sponsorship = result.data?.user?.sponsorshipsAsMaintainer?.nodes?.[0]

    if (sponsorship && !sponsorship.tier?.isOneTime && sponsorship.sponsorEntity) {
      const sponsor = sponsorship.sponsorEntity
      await prisma.githubSponsor.upsert({
        where: { login: sponsor.login },
        create: {
          login: sponsor.login,
          nodeId: sponsor.id,
          databaseId: sponsor.databaseId,
          user: {
            connect: { username: sponsor.login },
          },
        },
        update: {
          nodeId: sponsor.id,
          databaseId: sponsor.databaseId,
        },
      })
      return true
    }

    return false
  } catch (error) {
    console.error('Failed to check sponsor status:', error)
    return false
  }
}

// Extend the built-in types
declare module 'next-auth' {
  interface Profile {
    login: string
    name?: string | undefined
    email?: string | undefined
    avatar_url?: string
    id: string
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
      isSponsor?: boolean
    } & DefaultSession['user']
  }
}

// Test user details
const TEST_USER = {
  id: 'test-user-id',
  username: 'test',
  fullName: 'Test User',
}

const TEST_SPONSOR_USER = {
  id: '9167667c-e44a-4681-8514-c6588f791ecf',
  username: 'testSponsor',
  fullName: 'Test Sponsor',
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
          // Derive image URL from username
          image: `https://avatars.githubusercontent.com/${profile.login}?size=56`,
        }
      },
    }),
    CredentialsProvider({
      id: 'credentials',
      name: 'Test Account',
      credentials: {
        username: { type: 'text' },
        isTest: { type: 'boolean' },
        isSponsor: { type: 'boolean' },
      },
      async authorize(credentials) {
        console.log('authorize: starting with credentials:', credentials)
        if (process.env.NODE_ENV !== 'development' || !credentials?.isTest) {
          return null
        }

        // Use username to determine which test user to create/update
        const testUser = credentials.username === 'testSponsor' ? TEST_SPONSOR_USER : TEST_USER
        console.log('authorize: using test user:', testUser)

        // Create or update test user in DB
        console.log('authorize: attempting upsert with:', {
          where: { username: testUser.username },
          update: {},
          create: {
            id: testUser.id,
            username: testUser.username,
            fullName: testUser.fullName,
          },
        })
        const user = await prisma.user.upsert({
          where: { username: testUser.username },
          update: {},
          create: {
            id: testUser.id,
            username: testUser.username,
            fullName: testUser.fullName,
          },
        })
        console.log('authorize: created/updated user:', user)

        // Return the user object with derived image URL
        const result = {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          image: `https://avatars.githubusercontent.com/${user.username}?size=56`,
        }
        console.log('authorize: returning:', result)
        return result
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile, credentials }) {
      console.log('signIn: starting with:', { user, credentials })
      // Handle test users in development
      if (process.env.NODE_ENV === 'development' && credentials?.isTest) {
        const isTestSponsor = credentials?.isSponsor?.toString() === 'true'
        // Use the user object from authorize callback since it's already correct
        const testUser = {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
        }
        const sponsorLogin = `test_sponsor_${testUser.username}`
        console.log('signIn: test user setup:', { isTestSponsor, testUser, sponsorLogin })

        if (isTestSponsor) {
          // Check existing state
          const existingUser = await prisma.user.findUnique({
            where: { username: testUser.username },
            include: { sponsorship: true },
          })
          console.log('signIn: existing user before sponsor upsert:', existingUser)

          try {
            // Use a transaction for sponsor operations
            await prisma.$transaction(async tx => {
              // Delete any existing sponsor relationship
              if (existingUser?.sponsorship) {
                console.log('signIn: deleting existing sponsor:', existingUser.sponsorship)
                await tx.githubSponsor.delete({
                  where: { id: existingUser.sponsorship.id },
                })
              }

              // Create new sponsor relationship
              console.log('signIn: creating new sponsor relationship:', {
                login: sponsorLogin,
                nodeId: `TEST_SPONSOR_NODE_${testUser.id}`,
                databaseId: Math.floor(Math.random() * 999999),
                user: { connect: { username: testUser.username } },
              })
              const sponsor = await tx.githubSponsor.create({
                data: {
                  login: sponsorLogin,
                  nodeId: `TEST_SPONSOR_NODE_${testUser.id}`,
                  databaseId: Math.floor(Math.random() * 999999),
                  user: {
                    connect: { username: testUser.username },
                  },
                },
              })
              console.log('signIn: created sponsor:', sponsor)
              return sponsor
            })

            // Verify the sponsor was created
            const verifiedSponsor = await prisma.githubSponsor.findUnique({
              where: { login: sponsorLogin },
              include: { user: true },
            })
            console.log('signIn: verified sponsor creation:', verifiedSponsor)
          } catch (error) {
            console.error('Failed to create/update sponsor:', error)
            throw error // Let NextAuth handle the error
          }
        }

        return true
      }

      // Handle normal GitHub sign in
      if (account?.provider === 'github' && profile) {
        try {
          // Check if the current user is a sponsor
          const isSponsor = await checkUserSponsorStatus(profile.login)
          console.log(`User ${profile.login} sponsor status:`, isSponsor)

          // Create/update the user
          const existingUser = await prisma.user.findUnique({
            where: { username: profile.login },
          })

          if (existingUser) {
            await prisma.user.update({
              where: { username: profile.login },
              data: {
                id: user.id,
                fullName: profile.name || null,
              },
            })
          } else {
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
      console.log('jwt: starting with:', { token, user })
      if (user) {
        token.id = user.id
        token.username = user.username
      }
      // console.log('jwt: returning token:', token)
      return token
    },
    async session({ session, token }) {
      console.log('session: starting with:', { session, token })
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.username = token.username as string

        // Check for sponsor status in the database
        const sponsorLogin =
          process.env.NODE_ENV === 'development' && session.user.username === 'testSponsor'
            ? `test_sponsor_${session.user.username}`
            : session.user.username
        console.log('session: checking sponsor with login:', sponsorLogin)

        const sponsor = await prisma.githubSponsor.findUnique({
          where: {
            login: sponsorLogin,
          },
        })
        console.log('session: found sponsor:', sponsor)
        session.user.isSponsor = !!sponsor
      }
      // console.log('session: returning session:', session)
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
