import { gql, GraphQLClient } from 'graphql-request'

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

export async function getSponsors() {
  const endpoint = 'https://api.github.com/graphql'
  const githubToken = process.env.GITHUB_SPONSORS_TOKEN

  if (!githubToken) {
    // Return mock data or an empty array to avoid errors
    return [
      {
        login: 'johnlindquist',
      },
    ]
  }

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
  const response = await client.request<GitHubResponse>(query)

  return response.user.sponsors.nodes
}
