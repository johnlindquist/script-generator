export const CLI_API_KEY = process.env.CLI_API_KEY

if (!CLI_API_KEY) {
  console.warn('CLI_API_KEY is not set in environment variables')
}
