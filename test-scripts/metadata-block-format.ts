import '@johnlindquist/kit'

// This script uses the metadata block format
const metadata = {
  name: 'Test Script with Metadata Block',
  description: 'This is a test script using the metadata block format',
  author: 'John Lindquist',
}

await div(`
  <h1>${metadata.name}</h1>
  <p>${metadata.description}</p>
`)
