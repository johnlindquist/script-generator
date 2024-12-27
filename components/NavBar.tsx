"use client"

import { signOut } from "next-auth/react"
import Link from "next/link"

interface NavBarProps {
  isAuthenticated: boolean
}

export default function NavBar({ isAuthenticated }: NavBarProps) {
  return (
    <nav className="flex justify-between items-center mb-8">
      <Link href="/" className="text-4xl font-bold">
        Script Generator
      </Link>
      <div className="flex gap-4">
        {isAuthenticated ? (
          <button
            onClick={() => signOut()}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Sign Out
          </button>
        ) : (
          <Link
            href="/api/auth/signin"
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Sign in to Generate
          </Link>
        )}
      </div>
    </nav>
  )
} 