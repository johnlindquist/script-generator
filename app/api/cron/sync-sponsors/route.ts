import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('Starting cron sponsor sync...')
    let hasNextPage = true
    let cursor: string | null = null

    interface Sponsor {
      databaseId: number
      login: string
      id: string
    }

    interface SponsorNode {
      sponsorEntity?: Sponsor
      tier?: {
        isOneTime?: boolean
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

      const result = await response.json() as { 
        data?: { 
          user?: { 
            sponsorshipsAsMaintainer?: { 
              pageInfo: { hasNextPage: boolean; endCursor: string | null },
              nodes?: Array<{ 
                tier?: { isOneTime?: boolean }, 
                sponsorEntity?: { login: string, id: string, databaseId: number } 
              }> 
            } 
          } 
        } 
      }
      const { data } = result

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
        .map((node: SponsorNode) => node.sponsorEntity as Sponsor)

      allSponsors = [...allSponsors, ...pageSponsors]
      console.log(`Fetched ${pageSponsors.length} sponsors (total: ${allSponsors.length})`)
    }

    console.log('Processing sponsors:', allSponsors.length)

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

    console.log('Cron sponsor sync completed')
    return new Response('Sponsors synced successfully', { status: 200 })
  } catch (error) {
    console.error('Failed to sync sponsors:', error)
    return new Response('Failed to sync sponsors', { status: 500 })
  }
}
