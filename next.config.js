/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: config => {
    config.module.rules.push({
      test: /\.json$/,
      type: 'json',
    })
    return config
  },
  functions: {
    'app/api/generate-openrouter/**/*': {
      maxDuration: 60, // Set 60 second timeout specifically for the generate-openrouter route
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
      },
    ],
  },
}

module.exports = nextConfig
