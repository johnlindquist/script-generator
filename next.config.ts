import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack: config => {
    config.module.rules.push({
      test: /\.json$/,
      type: 'json',
    })
    return config
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

export default nextConfig
