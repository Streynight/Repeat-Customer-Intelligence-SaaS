const localAppUrl = 'http://localhost:3000'

export function requireAppUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  const appUrl = configured || (process.env.NODE_ENV === 'production' ? '' : localAppUrl)

  if (!appUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL is required outside local development.')
  }

  let parsed: URL
  try {
    parsed = new URL(appUrl)
  } catch {
    throw new Error('NEXT_PUBLIC_APP_URL must be a valid URL.')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('NEXT_PUBLIC_APP_URL must use http or https.')
  }

  if (process.env.NODE_ENV === 'production' && isLocalHost(parsed.hostname)) {
    throw new Error('NEXT_PUBLIC_APP_URL must not point to localhost in production.')
  }

  return parsed.origin
}

export function appUrl(path: string) {
  return new URL(path, `${requireAppUrl()}/`).toString()
}

function isLocalHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}
