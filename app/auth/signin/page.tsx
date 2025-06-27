'use client'

import { useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

export default function SignInPage() {
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // Get callbackUrl from query params, default to '/' if not provided
    const callbackUrl = searchParams.get('callbackUrl') || '/'
    signIn('github', { callbackUrl })
  }, [searchParams])

  return (
    <div className="flex justify-center items-center min-h-[200px]">
      <div className="text-gray-500">Redirecting to GitHub...</div>
    </div>
  )
}
