// Safe browser API wrappers
export const isBrowser = typeof window !== 'undefined'

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (!isBrowser) return null
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string): void => {
    if (!isBrowser) return
    try {
      localStorage.setItem(key, value)
    } catch {
      // Ignore errors (e.g., quota exceeded)
    }
  },
  removeItem: (key: string): void => {
    if (!isBrowser) return
    try {
      localStorage.removeItem(key)
    } catch {
      // Ignore errors
    }
  },
}

export const safeRequestAnimationFrame = (callback: FrameRequestCallback): number | null => {
  if (!isBrowser) return null
  return requestAnimationFrame(callback)
}

export const safeAlert = (message: string): void => {
  if (!isBrowser) return
  alert(message)
}