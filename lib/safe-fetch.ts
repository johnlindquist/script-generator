export async function safeFetch(url: string, options?: RequestInit) {
  try {
    const res = await fetch(url, { ...options, cache: 'no-store' })
    if (!res.ok) {
      // Log the error with more details
      const errorText = await res.text() // or res.json() if the error is JSON
      console.error(`safeFetch Error: ${res.status} ${res.statusText}`, {
        url,
        errorBody: errorText,
      })
      throw new Error(`${res.status} ${res.statusText}`)
    }
    // Check if the response is JSON before trying to parse it
    const contentType = res.headers.get('content-type')
    if (contentType && contentType.indexOf('application/json') !== -1) {
      return res.json()
    }
    return res.text() // Return as text if not JSON
  } catch (err) {
    console.error('safeFetch critical error:', { url, error: err })
    return null // or fallback data
  }
}
