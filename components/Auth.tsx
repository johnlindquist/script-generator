"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ReactNode } from "react"

interface AuthProps {
  children: ReactNode
}

export default function Auth({ children }: AuthProps) {
  const { status } = useSession({ required: true })
  const router = useRouter()

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return <>{children}</>
} 