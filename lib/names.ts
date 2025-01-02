export function generateDashedName(title: string): string {
  let dashed = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()

  // Ensure it's not too long (e.g., max 30 chars)
  if (dashed.length > 30) {
    dashed = dashed.slice(0, 30)
  }

  return dashed
}

export function generateUppercaseName(title: string): string {
  return title
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
    .replace(/[^a-zA-Z0-9]/g, '')
}
