import './globals.css'
import '@/lib/quiet-console'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { getServerSession } from 'next-auth'
import { NextAuthProvider } from '@/components/NextAuthProvider'
import NavBar from '@/components/NavBar'
import { authOptions } from './api/auth/[...nextauth]/route'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Script Kit - AI-Powered Script Generator for Automation | TypeScript Scripts',
  description:
    'Create Script Kit automation scripts using AI. Generate TypeScript scripts from natural language descriptions. Open-source, cross-platform desktop app for developers.',
  icons: {
    icon: '/favicon.ico',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'Script Kit - AI-Powered Script Generator for Automation',
    description:
      'Create Script Kit automation scripts using AI. Generate TypeScript scripts from natural language descriptions.',
    url: '/',
    siteName: 'Script Kit',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Script Kit - AI-Powered Script Generator',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Script Kit - AI-Powered Script Generator',
    description: 'Create automation scripts using AI. TypeScript script generation made easy.',
    creator: '@johnlindquist',
    images: ['/twitter-card.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Script Kit Generator',
    description: 'AI-powered script generator for Script Kit automation',
    url: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Windows, macOS, Linux',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    creator: {
      '@type': 'Person',
      name: 'John Lindquist',
      url: 'https://github.com/johnlindquist',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '500',
    },
  }

  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.className} text-text bg-background`}>
        <NextAuthProvider session={session}>
          <NuqsAdapter>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <NavBar isAuthenticated={!!session} />
            </div>
            <main>{children}</main>
            <Toaster />
            <Analytics />
            <SpeedInsights />
          </NuqsAdapter>
        </NextAuthProvider>
      </body>
    </html>
  )
}
