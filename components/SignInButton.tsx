'use client'

import { signIn } from 'next-auth/react'
import { STRINGS } from '@/lib/strings'
import { FaGithub } from 'react-icons/fa'

export default function SignInButton() {
  return (
    <button
      onClick={() => signIn('github', { callbackUrl: '/' })}
      className="bg-gradient-to-tr from-amber-300 to-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition flex items-center gap-2"
    >
      <FaGithub className="w-5 h-5" />
      {STRINGS.SIGN_IN_BUTTON.label}
    </button>
  )
}
