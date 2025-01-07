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

    const { data } = await response.json()
    const sponsorship = data?.user?.sponsorshipsAsMaintainer?.nodes?.[0]

    if (sponsorship && !sponsorship.tier?.isOneTime) {
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

// Function to sync all sponsors in batches
async function syncSponsorsInBackground() {
  try {
    console.log('Starting background sponsor sync...')
    let hasNextPage = true
    let cursor: string | null = null

    interface Sponsor {
      databaseId: number
      login: string
      id: string
    }

    interface SponsorNode {
      sponsorEntity: Sponsor
      tier: {
        isOneTime: boolean
      }
    }

    let allSponsors: Sponsor[] = []

    while (hasNextPage) {
      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_SPONSORS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query($cursor: String) {
              user(login: "${process.env.GITHUB_SPONSORS_LOGIN}") {
                sponsorshipsAsMaintainer(first: 100, after: $cursor, includePrivate: true) {
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
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
          variables: { cursor },
        }),
      })

      const { data } = await response.json()

      if (!data?.user?.sponsorshipsAsMaintainer?.nodes) {
        console.error('Failed to fetch sponsors page')
        break
      }

      const pageInfo: { hasNextPage: boolean; endCursor: string | null } =
        data.user.sponsorshipsAsMaintainer.pageInfo
      hasNextPage = pageInfo.hasNextPage
      cursor = pageInfo.endCursor

      const pageSponsors = data.user.sponsorshipsAsMaintainer.nodes
        .filter((node: SponsorNode) => !node.tier?.isOneTime && node.sponsorEntity)
        .map((node: SponsorNode) => node.sponsorEntity)

      allSponsors = [...allSponsors, ...pageSponsors]
      console.log(`Fetched ${pageSponsors.length} sponsors (total: ${allSponsors.length})`)
    }

    console.log('Processing sponsors in background:', allSponsors.length)

    // Process in batches of 50
    const batchSize = 50
    for (let i = 0; i < allSponsors.length; i += batchSize) {
      const batch = allSponsors.slice(i, i + batchSize)
      await Promise.all(
        batch.map(async (sponsor: Sponsor) => {
          try {
            await prisma.githubSponsor.upsert({
              where: { login: sponsor.login },
              create: {
                login: sponsor.login,
                nodeId: sponsor.id,
                databaseId: sponsor.databaseId,
                user: {
                  connectOrCreate: {
                    where: { username: sponsor.login },
                    create: {
                      id: sponsor.id,
                      username: sponsor.login,
                    },
                  },
                },
              },
              update: {
                nodeId: sponsor.id,
                databaseId: sponsor.databaseId,
              },
            })
            console.log('Synced sponsor:', sponsor.login)
          } catch (err) {
            console.error(`Failed to sync sponsor ${sponsor.login}:`, err)
          }
        })
      )
    }

    // Clean up old sponsors
    const activeLogins = allSponsors.map((s: Sponsor) => s.login)
    if (activeLogins.length > 0) {
      // Safety check: Only remove sponsors if we got a good number of them
      const currentSponsorsCount = await prisma.githubSponsor.count()
      const minExpectedSponsors = Math.max(20, currentSponsorsCount - 5) // Never delete if we get less than 20 sponsors or if we lost more than 5

      if (activeLogins.length >= minExpectedSponsors) {
        console.log(
          `Removing inactive sponsors. Active: ${activeLogins.length}, Current: ${currentSponsorsCount}`
        )
        await prisma.githubSponsor.deleteMany({
          where: {
            login: { notIn: activeLogins },
          },
        })
      } else {
        console.error(
          `Safety check prevented sponsor deletion. Got ${activeLogins.length} sponsors, expected at least ${minExpectedSponsors}`
        )
      }
    }

    console.log('Background sponsor sync completed')
  } catch (error) {
    console.error('Failed to sync sponsors:', error)
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
          // First check if the current user is a sponsor
          const isSponsor = await checkUserSponsorStatus(profile.login)
          console.log(`User ${profile.login} sponsor status:`, isSponsor)

          // Start background sync
          syncSponsorsInBackground().catch(console.error)

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

        // Add sponsor check using login (username) as the unique identifier
        const sponsor = await prisma.githubSponsor.findUnique({
          where: {
            login: session.user.username,
          },
        })
        session.user.isSponsor = !!sponsor
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
