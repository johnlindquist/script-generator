import './globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { getServerSession } from 'next-auth'
import { NextAuthProvider } from '@/components/NextAuthProvider'
import NavBar from '@/components/NavBar'
import { authOptions } from './api/auth/[...nextauth]/route'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Script Kit',
  description: 'Generate shell scripts using AI',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.className} text-slate-300`}
        style={{ background: 'var(--background)' }}
      >
        <NextAuthProvider session={session}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-4">
            <NavBar isAuthenticated={!!session} />
          </div>
          <div className="container mx-auto px-4 sm:px-4">{children}</div>
          <Toaster />
          <Analytics />
          <SpeedInsights />
        </NextAuthProvider>
      </body>
    </html>
  )
}
