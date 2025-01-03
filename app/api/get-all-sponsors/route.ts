import { gql, GraphQLClient } from 'graphql-request'
import { NextResponse } from 'next/server'
import { PrismaClient, GithubSponsor, User } from '@prisma/client'

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

interface SponsorWithUser extends GitHubSponsor {
  user?: User | null
}

const prisma = new PrismaClient()

export async function GET() {
  const endpoint = 'https://api.github.com/graphql'
  const client = new GraphQLClient(endpoint, {
    headers: {
      'GraphQL-Features': 'discussions_api',
      authorization: `Bearer ${process.env.GITHUB_DISCUSSIONS_TOKEN}`,
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

  const response = await client.request<GitHubResponse>(query)
  const sponsors = response.user.sponsors.nodes

  // Get all sponsors from database
  const dbSponsors = await prisma.githubSponsor.findMany({
    include: {
      user: true,
    },
  })

  // Merge GitHub sponsors with database sponsors
  const mergedSponsors: SponsorWithUser[] = sponsors.map(sponsor => {
    const dbSponsor = dbSponsors.find(
      (db: GithubSponsor & { user: User | null }) => db.nodeId === sponsor.id
    )
    return {
      ...sponsor,
      user: dbSponsor?.user,
    }
  })

  return NextResponse.json(mergedSponsors)
}
