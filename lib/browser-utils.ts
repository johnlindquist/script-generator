// Safe browser API wrappers
export const isBrowser = typeof window !== 'undefined'

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (!isBrowser) return null
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string): void => {
    if (!isBrowser) return
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // Ignore errors (e.g., quota exceeded)
    }
  },
  removeItem: (key: string): void => {
    if (!isBrowser) return
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Ignore errors
    }
  },
}

export const safeRequestAnimationFrame = (callback: (time: number) => void): number | null => {
  if (!isBrowser) return null
  return window.requestAnimationFrame(callback)
}

export const safeAlert = (message: string): void => {
  if (!isBrowser) return
  window.alert(message)
}