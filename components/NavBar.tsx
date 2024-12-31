'use client'

import { signOut, useSession, signIn } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeftOnRectangleIcon } from '@heroicons/react/24/solid'
import { FaGithub } from 'react-icons/fa'
import { STRINGS } from '@/lib/strings'

interface NavBarProps {
  isAuthenticated: boolean
}

export default function NavBar({ isAuthenticated }: NavBarProps) {
  const { data: session } = useSession()

  return (
    <nav className="flex justify-between items-center mb-8">
      <Link
        href="/"
        className="text-4xl font-bold text-amber-300 hover:text-amber-200 transition-colors"
      >
        {STRINGS.NAVBAR.homeLinkLabel}
      </Link>
      <div className="flex gap-4 items-center">
        {isAuthenticated ? (
          <>
            <Link
              href="/scripts/new"
              className="bg-gradient-to-tr from-amber-300 to-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition flex items-center gap-2"
            >
              {STRINGS.NAVBAR.addScript}
            </Link>
            <button
              onClick={() => signOut()}
              className="bg-gradient-to-tr from-amber-300 to-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition flex items-center gap-2"
            >
              <ArrowLeftOnRectangleIcon className="w-5 h-5" />
              {STRINGS.NAVBAR.signOut}
            </button>
            {session?.user?.image && (
              <Image
                src={session.user.image}
                alt={STRINGS.NAVBAR.userAvatarAlt}
                width={32}
                height={32}
                className="rounded-full"
              />
            )}
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
