// Simple function to test our parsing logic
function parseScriptName(content: string): string | undefined {
  // Try to match the inline comment format: // Name: Script Name
  const commentRegex = /\/\/\s*Name:\s*(.+)/i
  const commentMatch = content.match(commentRegex)
  if (commentMatch) {
    return commentMatch[1].trim()
  }

  // Try to match the metadata object format: metadata = { name: "Script Name" }
  const metadataRegex = /metadata\s*=\s*\{\s*name\s*:\s*["']([^"']+)["']/i
  const metadataMatch = content.match(metadataRegex)
  if (metadataMatch) {
    return metadataMatch[1].trim()
  }

  return undefined
}

// Test scripts
const inlineCommentScript = `
// Name: Test Script with Inline Comment
// Description: This is a test script using the inline comment format
// Author: John Lindquist

import "@johnlindquist/kit"

await div(\`
  <h1>Test Script with Inline Comment</h1>
  <p>This script demonstrates the inline comment format for metadata.</p>
\`)
`

const metadataBlockScript = `
import "@johnlindquist/kit"

// This script uses the metadata block format
const metadata = { 
  name: "Test Script with Metadata Block",
  description: "This is a test script using the metadata block format",
  author: "John Lindquist"
}

await div(\`
  <h1>\${metadata.name}</h1>
  <p>\${metadata.description}</p>
\`)
`

// Parse scripts
const inlineCommentName = parseScriptName(inlineCommentScript)
const metadataBlockName = parseScriptName(metadataBlockScript)

// Display results
console.log('Inline Comment Format Name:', inlineCommentName)
console.log('Metadata Block Format Name:', metadataBlockName)
