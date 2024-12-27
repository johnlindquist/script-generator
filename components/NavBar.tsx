"use client"

import { signOut } from "next-auth/react"
import Link from "next/link"
import { ArrowLeftOnRectangleIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/solid"

interface NavBarProps {
  isAuthenticated: boolean
}

export default function NavBar({ isAuthenticated }: NavBarProps) {
  return (
    <nav className="flex justify-between items-center mb-8">
      <Link href="/" className="text-4xl font-bold text-amber-300 hover:text-amber-200 transition-colors">
        Script Generator
      </Link>
      <div className="flex gap-4">
        {isAuthenticated ? (
          <button
            onClick={() => signOut()}
            className="bg-gradient-to-tr from-cyan-300 to-cyan-400 text-gray-900 font-semibold px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition flex items-center gap-2"
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5" />
            Sign Out
          </button>
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