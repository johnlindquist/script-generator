'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeftOnRectangleIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/solid'

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
        Script Generator
      </Link>
      <div className="flex gap-4">
        {isAuthenticated ? (
          <>
            <Link
              href="/scripts/new"
              className="bg-gradient-to-tr from-amber-300 to-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition flex items-center gap-2"
            >
              + New Script
            </Link>
            <button
              onClick={() => signOut()}
              className="bg-gradient-to-tr from-amber-300 to-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition flex items-center gap-2"
            >
              <ArrowLeftOnRectangleIcon className="w-5 h-5" />
              Sign Out
              {session?.user?.image && (
                <Image
                  src={session.user.image}
                  alt="User avatar"
                  width={30}
                  height={30}
                  className="rounded-full -mr-1"
                />
              )}
            </button>
          </>
        ) : (
          <Link
            href="/api/auth/signin"
            className="bg-gradient-to-tr from-amber-300 to-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition flex items-center gap-2"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Sign in to Generate
          </Link>
        )}
      </div>
    </nav>
  )
}
