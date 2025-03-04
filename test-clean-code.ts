import { cleanCodeFences } from './lib/generation'

// Example of problematic input with code fences
const input = `\`\`\`typescript
// Shortcut: cmd+shift+f
import '@johnlindquist/kit'
\`\`\``

console.log('Original input:')
console.log(input)
console.log('\nCleaned output:')
console.log(cleanCodeFences(input))
