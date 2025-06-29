import '@johnlindquist/kit'
import { gql, GraphQLClient } from 'graphql-request'

const endpoint = 'https://app.egghead.io/graphql'
const slugs = await arg('Course slug or slugs separated with comma')

const client = new GraphQLClient(endpoint)

const query = gql`
  query CourseQuery($slug: String!) {
    course(slug: $slug) {
      title
      slug
      path
      duration
      image_thumb_url
      instructor {
        full_name
      }
      lessons {
        title
        path
        duration
      }
    }
  }
`
const courses = []

for (const courseSlug of slugs.split(',')) {
  const response = await client.request(query, { slug: courseSlug })
  const course = response.course
  courses.push(course)
}

await outputJson(projectPath('public', 'data', 'courses.json'), courses)
