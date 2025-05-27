import './globals.css'
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
  title: 'Script Kit',
  description: 'An open-source, cross-platform, desktop app for creating and running scripts!',
  icons: {
    icon: '/favicon.ico',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en" className="dark">
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
