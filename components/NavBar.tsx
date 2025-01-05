'use client'

import { signOut, useSession, signIn } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeftOnRectangleIcon } from '@heroicons/react/24/solid'
import { FaGithub } from 'react-icons/fa'
import { STRINGS } from '@/lib/strings'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'

interface NavBarProps {
  isAuthenticated: boolean
}

export default function NavBar({ isAuthenticated }: NavBarProps) {
  const { data: session } = useSession()

  return (
    <nav className="flex justify-between items-center mb-8">
      <Link href="/" className="flex items-center">
        <div className="flex items-center justify-center w-10 h-10 tracking-tighter">
          <Image src="/assets/logo-v2.png" alt="Script Kit Logo" width={40} height={40} />
        </div>
        <div className="pl-2">
          <div className="text-lg font-semibold leading-none">Script Kit</div>
          <div className="text-sm opacity-80 leading-none">by John Lindquist</div>
        </div>
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
            <Menu as="div" className="relative inline-block text-left">
              <Menu.Button className="focus:outline-none">
                {session?.user?.image && (
                  <Image
                    src={session.user.image}
                    alt={STRINGS.NAVBAR.userAvatarAlt}
                    width={32}
                    height={32}
                    className="rounded-full cursor-pointer hover:ring-2 hover:ring-amber-400/50 transition-all"
                  />
                )}
              </Menu.Button>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items
                  className="absolute right-0 mt-2 w-48 bg-neutral-800 rounded-lg shadow-xl border border-amber-400/10"
                  anchor={{ to: 'bottom end', gap: 4 }}
                >
                  <Menu.Item>
                    {({ active }) => (
                      <Link
                        href="/new"
                        className={`block px-4 py-2 text-sm text-amber-300 hover:bg-neutral-700 rounded-t-lg transition-colors ${
                          active ? 'bg-neutral-700' : ''
                        }`}
                      >
                        {STRINGS.NAVBAR.addScript}
                      </Link>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <Link
                        href="/scripts/mine"
                        className={`block px-4 py-2 text-sm text-amber-300 hover:bg-neutral-700 transition-colors ${
                          active ? 'bg-neutral-700' : ''
                        }`}
                      >
                        My Scripts
                      </Link>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <Link
                        href="/scripts/sync"
                        className={`block px-4 py-2 text-sm text-amber-300 hover:bg-neutral-700 transition-colors ${
                          active ? 'bg-neutral-700' : ''
                        }`}
                      >
                        Sync GitHub Repo
                      </Link>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <Link
                        href="/scripts/import"
                        className={`block px-4 py-2 text-sm text-amber-300 hover:bg-neutral-700 transition-colors ${
                          active ? 'bg-neutral-700' : ''
                        }`}
                      >
                        Import Scripts
                      </Link>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => signOut()}
                        className={`w-full text-left px-4 py-2 text-sm text-amber-300 hover:bg-neutral-700 rounded-b-lg transition-colors flex items-center gap-2 ${
                          active ? 'bg-neutral-700' : ''
                        }`}
                      >
                        <ArrowLeftOnRectangleIcon className="w-4 h-4" />
                        {STRINGS.NAVBAR.signOut}
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Transition>
            </Menu>
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
