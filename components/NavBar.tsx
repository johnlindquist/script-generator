'use client'

import { signOut, useSession, signIn } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeftOnRectangleIcon } from '@heroicons/react/24/solid'
import { FaGithub, FaDiscord } from 'react-icons/fa'
import { StarIcon } from '@heroicons/react/24/solid'
import { STRINGS } from '@/lib/strings'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { Button } from './ui/button'

interface NavBarProps {
  isAuthenticated: boolean
}

export default function NavBar({ isAuthenticated }: NavBarProps) {
  const { data: session } = useSession()

  return (
    <nav className="flex justify-between items-center">
      <Link href="/" className="flex items-center">
        <div className="flex items-center justify-center w-8 h-8 min-w-8 min-h-8 sm:w-10 sm:h-10 tracking-tighter">
          <Image
            src="/assets/logo-v2.png"
            alt="Script Kit Logo"
            width={32}
            height={32}
            className="min-w-[32px] min-h-[32px] sm:w-10 sm:h-10"
          />
        </div>
        <div className="pl-2">
          <div className="text-lg font-semibold leading-none">Script Kit</div>
          <div className="text-sm opacity-80 leading-none hidden sm:block">by John Lindquist</div>
        </div>
      </Link>
      <div className="flex gap-4 items-center">
        <Link href={STRINGS.SOCIAL.DISCORD_URL} target="_blank" rel="noopener noreferrer">
          <FaDiscord className="w-5 h-5 hover:text-amber-400 transition-colors" />
        </Link>
        <Link
          href={STRINGS.SOCIAL.GITHUB_DISCUSSIONS_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FaGithub className="w-5 h-5 hover:text-amber-400 transition-colors" />
        </Link>
        {process.env.NODE_ENV === 'development' && !isAuthenticated && (
          <>
            <Button
              variant="outline"
              onClick={async () => {
                await signIn('credentials', {
                  callbackUrl: '/',
                  username: 'test',
                  isTest: true,
                  isSponsor: false,
                })
              }}
            >
              Test Normal
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                await signIn('credentials', {
                  callbackUrl: '/',
                  username: 'testSponsor',
                  isTest: true,
                  isSponsor: true,
                })
              }}
            >
              Test Sponsor
            </Button>
          </>
        )}
        {isAuthenticated ? (
          <>
            <Menu as="div" className="relative inline-block text-left">
              <Menu.Button className="focus:outline-none relative">
                {session?.user?.image && (
                  <>
                    <Image
                      src={session.user.image}
                      alt={STRINGS.NAVBAR.userAvatarAlt}
                      width={32}
                      height={32}
                      className="rounded-full cursor-pointer hover:ring-2 hover:ring-amber-400/50 transition-all"
                    />
                    {session.user.isSponsor && (
                      <StarIcon className="w-3 h-3 text-amber-300 absolute -top-0.5 -right-0.5" />
                    )}
                  </>
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
          <Button variant="secondary" onClick={() => signIn('github', { callbackUrl: '/' })}>
            <FaGithub className="w-5 h-5" />
            <span className="hidden sm:inline">{STRINGS.NAVBAR.signInToGenerate}</span>
            <span className="sm:hidden">Sign in</span>
          </Button>
        )}
      </div>
    </nav>
  )
}
