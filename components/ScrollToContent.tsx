'use client'
import { useEffect } from 'react'

interface ScrollToContentProps {
  children: React.ReactNode
}

export default function ScrollToContent({ children }: ScrollToContentProps) {
  useEffect(() => {
    // Check if any query parameters exist on the URL
    if (window.location.search) {
      const element = document.getElementById('scripts')
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [])

  return <>{children}</>
}
