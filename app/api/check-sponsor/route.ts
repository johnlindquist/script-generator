// Next.js API route to check if user is a sponsor
import { gql, GraphQLClient } from 'graphql-request'
import { NextResponse } from 'next/server'
import { readJSON } from 'fs-extra'
import { PrismaClient } from '@prisma/client'
import { GitHubUserSchema } from '@/lib/schemas'

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

const prisma = new PrismaClient()

export async function POST(request: Request) {
  const body = await request.json()
  const parseResult = GitHubUserSchema.safeParse(body)
  
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  
  const { id, login, node_id, twitter_username, email, name, feature } = parseResult.data

  // Load in the "free-riders.json" from /public
  console.log(`Loading free-riders.json`)
  const { logins } = await readJSON(`${process.cwd()}/public/free-riders.json`)

  console.log({ logins })
  if (logins.includes(login)) {
    return NextResponse.json({
      id: node_id,
      login,
      node_id,
      twitter_username,
      email,
      name,
      feature,
    })
  }

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

  const isSponsor = sponsors.find(s => {
    return s.id === node_id && s.login === login && s.databaseId === Number(id)
  })

  if (isSponsor) {
    // Update or create sponsor record
    await prisma.githubSponsor.upsert({
      where: { id: node_id },
      create: {
        id: node_id,
        login,
        nodeId: node_id,
        databaseId: Number(id),
      },
      update: {
        login,
        nodeId: node_id,
        databaseId: Number(id),
        user: {
          update: {
            username: login,
            fullName: name,
          },
        },
      },
    })
  }

  return NextResponse.json(isSponsor)
}
