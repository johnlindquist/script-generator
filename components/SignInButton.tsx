'use client'

import { signIn } from 'next-auth/react'
import { STRINGS } from '@/lib/strings'

export default function SignInButton() {
  return (
    <button onClick={() => signIn()} className="text-amber-400 hover:underline">
      {STRINGS.SIGN_IN_BUTTON.label}
    </button>
  )
}
