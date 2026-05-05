const defaultRedirectPath = '/dashboard'

export function safeAuthRedirectPath(value: string | null | undefined, fallback = defaultRedirectPath) {
  if (!value) return fallback

  const trimmed = value.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback

  try {
    const parsed = new URL(trimmed, 'https://repeattree.local')
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}
