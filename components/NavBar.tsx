'use client'

import { signOut, useSession, signIn } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeftOnRectangleIcon } from '@heroicons/react/24/solid'
import { FaGithub } from 'react-icons/fa'
import { STRINGS } from '@/lib/strings'
import { useState } from 'react'

interface NavBarProps {
  isAuthenticated: boolean
}

export default function NavBar({ isAuthenticated }: NavBarProps) {
  const { data: session } = useSession()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  return (
    <nav className="flex justify-between items-center mb-8">
      <Link
        href="/"
        className="text-4xl font-bold text-amber-300 hover:text-amber-200 transition-colors"
      >
        {STRINGS.NAVBAR.homeLinkLabel}
      </Link>
      <div className="flex gap-4 items-center">
        {process.env.NODE_ENV === 'development' && !isAuthenticated && (
          <button
            onClick={async () => {
              await signIn('credentials', {
                callbackUrl: '/',
                username: 'test',
                isTest: true,
              })
            }}
            className="bg-gray-700 text-amber-300 px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Test Account
          </button>
        )}
        {isAuthenticated ? (
          <>
            <div className="relative">
              {session?.user?.image && (
                <Image
                  src={session.user.image}
                  alt={STRINGS.NAVBAR.userAvatarAlt}
                  width={32}
                  height={32}
                  className="rounded-full cursor-pointer hover:ring-2 hover:ring-amber-400/50 transition-all"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                />
              )}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-neutral-800 rounded-lg shadow-xl border border-amber-400/10 z-50">
                  <Link
                    href="/new"
                    className="block px-4 py-2 text-sm text-amber-300 hover:bg-neutral-700 rounded-t-lg transition-colors"
                  >
                    {STRINGS.NAVBAR.addScript}
                  </Link>
                  <Link
                    href="/scripts/mine"
                    className="block px-4 py-2 text-sm text-amber-300 hover:bg-neutral-700 transition-colors"
                  >
                    My Scripts
                  </Link>
                  <Link
                    href="/scripts/sync"
                    className="block px-4 py-2 text-sm text-amber-300 hover:bg-neutral-700 transition-colors"
                  >
                    Sync GitHub Repo
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="w-full text-left px-4 py-2 text-sm text-amber-300 hover:bg-neutral-700 rounded-b-lg transition-colors flex items-center gap-2"
                  >
                    <ArrowLeftOnRectangleIcon className="w-4 h-4" />
                    {STRINGS.NAVBAR.signOut}
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <button
            onClick={() => signIn('github', { callbackUrl: '/' })}
            className="bg-gradient-to-tr from-amber-300 to-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition flex items-center gap-2"
          >
            <FaGithub className="w-5 h-5" />
            {STRINGS.NAVBAR.signInToGenerate}
          </button>
        )}
      </div>
    </nav>
  )
}
