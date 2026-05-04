import { afterEach, describe, expect, it, vi } from 'vitest'
import { appUrl, requireAppUrl } from '@/lib/app-url'

describe('app URL helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('builds absolute URLs from the configured application origin', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://www.repeattree.com/')

    expect(requireAppUrl()).toBe('https://www.repeattree.com')
    expect(appUrl('/auth/callback?next=/dashboard')).toBe('https://www.repeattree.com/auth/callback?next=/dashboard')
  })

  it('uses localhost only outside production when no app URL is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    vi.stubEnv('NODE_ENV', 'test')

    expect(appUrl('/settings')).toBe('http://localhost:3000/settings')
  })

  it('rejects missing or localhost app URLs in production', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    vi.stubEnv('NODE_ENV', 'production')
    expect(() => requireAppUrl()).toThrow('NEXT_PUBLIC_APP_URL is required outside local development.')

    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
    expect(() => requireAppUrl()).toThrow('NEXT_PUBLIC_APP_URL must not point to localhost in production.')
  })
})
