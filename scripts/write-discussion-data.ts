import '@johnlindquist/kit'
import { getMetadata } from '@johnlindquist/kit/core/utils'
import { gql, GraphQLClient } from 'graphql-request'
import slugify from 'slugify'

import { Discussion } from '../src/lib/get-discussions'
import { Extension, LoadedScript } from './types'

export enum Category {
  Announcements = 'MDE4OkRpc2N1c3Npb25DYXRlZ29yeTMyODIwMDgw',
  Guide = 'MDE4OkRpc2N1c3Npb25DYXRlZ29yeTMyODc5NjIx',
  Share = 'MDE4OkRpc2N1c3Npb25DYXRlZ29yeTMyMDg0MTcw',
  Docs = 'DIC_kwDOEu7MBc4B_u-c',
}

const endpoint = 'https://api.github.com/graphql'

const categoryKey: keyof Category = await arg<keyof Category>('Category', Object.keys(Category))

const category = {
  name: categoryKey as string,
  value: (Category as any)[categoryKey] as string,
}

const client = new GraphQLClient(endpoint, {
  headers: {
    'GraphQL-Features': 'discussions_api',
    authorization: `Bearer ${await env('GITHUB_DISCUSSIONS_TOKEN')}`,
  },
})

const query = gql`
  query ($categoryId: ID) {
    repository(owner: "johnlindquist", name: "kit") {
      discussions(
        first: 100
        categoryId: $categoryId
        orderBy: { field: CREATED_AT, direction: DESC }
      ) {
        # type: DiscussionConnection
        totalCount # Int!
        nodes {
          title
          url
          author {
            ... on User {
              twitterUsername
              name
            }
            login
            avatarUrl
            url
          }
          body
          id
          createdAt
        }
      }
    }
  }
`

const response = await client.request(query, { categoryId: category.value })

const discussions: Discussion[] = response.repository.discussions.nodes.map((d: Discussion) => {
  const slug = slugify(d.title, {
    lower: true,
    strict: true,
  })

  return {
    ...d,
    slug,
  }
})

// Don't have time, ugh...
const loadedScripts: any[] = discussions.map(
  ({ author, body, createdAt, id, slug, title, url: discussion }) => {
    const url = body.match(/(?<=(Install|Open).*)https:\/\/gist.*ts(?=\"|\))/gim)?.[0] || ''
    const metadata = getMetadata(body)

    const [, dir, file] = body.match(/(?<=<meta path=")(.*)\/(.*)(?=")/) || [null, '', '']

    const [description] = body.match(/(?<=<meta description=")(.*)(?=")/) || ['']
    const [tag] = body.match(/(?<=<meta tag=")(.*)(?=")/) || ['']
    const [section] = body.match(/(?<=<meta section=")(.*)(?=")/) || ['']
    const [i] = body.match(/(?<=<meta i=")(.*)(?=")/) || ['']
    const [sectionIndex] = body.match(/(?<=<meta sectionIndex=")(.*)(?=")/) || ['']

    const content = body
    // let prevLength = 0

    // let i = 0
    // for (let s of body.matchAll(/(`{3}js)(.{5,}?)(`{3})/gs)) {
    //   i++
    //   if (s[2] && s.index) {
    //     let c = Buffer.from(s[2]).toString('base64url')
    //     let name = `${slug}-example-${i}`
    //     let link = `\n\n[Create script from example below](kit:snippet?name=${name}&content=${c})\n`

    //     let index = s.index + prevLength
    //     content = [content.slice(0, index), link, content.slice(index)].join('')
    //     prevLength += link.length
    //   }
    // }

    // Safely handle missing author fields
    const safeAvatar = author?.avatarUrl ?? ''
    const safeUser = author?.login ?? ''
    const safeAuthorName = (author as any)?.name ?? ''
    const safeTwitter = (author as any)?.twitterUsername ?? ''

    return {
      ...metadata,
      avatar: safeAvatar,
      user: safeUser,
      author: safeAuthorName,
      twitter: safeTwitter,
      discussion,
      url,
      title,
      command: slug,
      content,
      extension: Extension.md,
      dir,
      file,
      description,
      tag,
      section,
      i,
      sectionIndex,
      createdAt,
    }
  }
)

await outputJson(
  projectPath('public', 'data', `${category.name.toLowerCase()}.json`),
  loadedScripts
)
