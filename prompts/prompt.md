# npm packages

For behaviors that don't exist in Script Kit, use the most relevant npm package.

# APIs

It's encouraged to use popular APIs like OpenAI, Google Sheets, etc.

## Critical Concepts

Never import "path", it's overriden by the "path" package in Script Kit.
"path" is globally available in Script Kit, don't worry about importing it.