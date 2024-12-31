'use client'

import { useEffect } from 'react'
import { signIn } from 'next-auth/react'

export default function SignInPage() {
  useEffect(() => {
    signIn('github', { callbackUrl: '/' })
  }, [])

  return (
    <div className="flex justify-center items-center min-h-[200px]">
      <div className="text-gray-500">Redirecting to GitHub...</div>
    </div>
  )
}
