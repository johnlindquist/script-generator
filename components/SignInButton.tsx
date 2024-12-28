'use client'

import { signIn } from 'next-auth/react'

export default function SignInButton() {
  return (
    <button onClick={() => signIn()} className="text-amber-400 hover:underline">
      sign in
    </button>
  )
}
