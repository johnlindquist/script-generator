import { gql, GraphQLClient } from 'graphql-request'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface GitHubSponsor {
  __typename: string
  login: string
  id: string
  databaseId: number
}

interface GitHubResponse {
  user: {
    sponsors: {
      totalCount: number
      nodes: GitHubSponsor[]
    }
  }
}

interface SimplifiedSponsor {
  login: string
  user: {
    username: string | null
    fullName: string | null
  } | null
}

export async function GET() {
  const requestId = Math.random().toString(36).substring(7)
  console.log(`[${requestId}] Starting sponsors fetch`)

  try {
    // Check for GitHub token
    const githubToken = process.env.GITHUB_SPONSORS_TOKEN
    if (!githubToken) {
      console.warn(
        `[${requestId}] GITHUB_SPONSORS_TOKEN not found. Using mock data for development.`
      )
      // Return mock data for development
      return NextResponse.json([
        {
          login: 'johnlindquist',
          user: {
            username: 'johnlindquist',
            fullName: 'John Lindquist',
          },
        },
        {
          login: 'cursor',
          user: {
            username: 'cursor',
            fullName: 'Cursor',
          },
        },
      ] as SimplifiedSponsor[])
    }

    console.log(`[${requestId}] Initializing GraphQL client`)
    const endpoint = 'https://api.github.com/graphql'
    const client = new GraphQLClient(endpoint, {
      headers: {
        'GraphQL-Features': 'discussions_api',
        authorization: `Bearer ${githubToken}`,
      },
    })

    const query = gql`
      query {
        user(login: "johnlindquist") {
          ... on Sponsorable {
            sponsors(first: 100) {
              totalCount
              nodes {
                ... on User {
                  __typename
                  login
                  id
                  databaseId
                }
                ... on Organization {
                  __typename
                  login
                  id
                  databaseId
                }
              }
            }
          }
        }
      }
    `

    console.log(`[${requestId}] Fetching sponsors from GitHub`)
    let response
    try {
      response = await client.request<GitHubResponse>(query)
    } catch (graphqlError) {
      console.error(`[${requestId}] GraphQL request failed:`, {
        error: graphqlError,
        token: `${githubToken.slice(0, 4)}...${githubToken.slice(-4)}`,
        headers: client.requestConfig.headers,
      })
      throw new Error('GraphQL request failed')
    }

    if (!response?.user?.sponsors?.nodes) {
      console.error(`[${requestId}] Invalid response structure:`, response)
      throw new Error('Invalid response structure from GitHub')
    }

    const sponsors = response.user.sponsors.nodes
    console.log(`[${requestId}] Found ${sponsors.length} sponsors on GitHub`)

    // Get all sponsors from database with specific fields
    console.log(`[${requestId}] Fetching sponsor data from database`)
    let dbSponsors
    try {
      // First check if we can connect to the database
      await prisma.$connect()

      dbSponsors = await prisma.githubSponsor.findMany({
        include: {
          user: {
            select: {
              username: true,
              fullName: true,
            },
          },
        },
      })
      console.log(`[${requestId}] Found ${dbSponsors.length} sponsors in database`)
    } catch (dbError) {
      console.error(`[${requestId}] Database query failed:`, dbError)
      // For now, if database fails, we'll still return GitHub data
      console.log(`[${requestId}] Continuing with GitHub data only`)
      return NextResponse.json(
        sponsors.map(sponsor => ({
          login: sponsor.login,
          user: null,
        }))
      )
    } finally {
      try {
        await prisma.$disconnect()
      } catch (disconnectError) {
        console.error(`[${requestId}] Error disconnecting from database:`, disconnectError)
      }
    }

    // Merge GitHub sponsors with database sponsors and simplify the response
    console.log(`[${requestId}] Merging GitHub and database sponsor data`)
    const mergedSponsors: SimplifiedSponsor[] = sponsors.map(sponsor => {
      const dbSponsor = dbSponsors?.find(db => db.nodeId === sponsor.id)
      if (!dbSponsor) {
        console.log(`[${requestId}] No database record found for sponsor: ${sponsor.login}`)
      }
      return {
        login: sponsor.login,
        user: dbSponsor?.user || null,
      }
    })

    console.log(`[${requestId}] Successfully processed ${mergedSponsors.length} sponsors`)
    return NextResponse.json(mergedSponsors)
  } catch (error) {
    console.error(`[${requestId}] Error in sponsors API:`, {
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : error,
    })

    // Determine if it's a known error type and return appropriate status
    let status = 500
    let message = 'Failed to fetch sponsors'

    if (error instanceof Error) {
      if (error.message.includes('GraphQL request failed')) {
        status = 401
        message = 'GitHub authentication failed'
      } else if (error.message.includes('database')) {
        status = 503
        message = 'Database service unavailable'
      }
    }

    return NextResponse.json(
      {
        error: message,
        requestId, // Include requestId in response for debugging
      },
      { status }
    )
  }
}
