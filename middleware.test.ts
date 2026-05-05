import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { middleware } from './middleware'

const getUserMock = vi.hoisted(() => vi.fn())

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: getUserMock,
    },
  })),
}))

describe('middleware auth routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    getUserMock.mockResolvedValue({ data: { user: null } })
  })

  it('sends authenticated homepage visits directly to the workspace', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const response = await middleware(new NextRequest('https://www.repeattree.com/'))

    expect(response.headers.get('location')).toBe('https://www.repeattree.com/dashboard')
  })

  it('sends authenticated login visits to the requested next path', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const response = await middleware(
      new NextRequest('https://www.repeattree.com/login?next=%2Fbilling%2Fcheckout%3Fplan%3Dgrowth'),
    )

    expect(response.headers.get('location')).toBe('https://www.repeattree.com/billing/checkout?plan=growth')
  })

  it('keeps protected-page redirects resumable after sign in', async () => {
    const response = await middleware(new NextRequest('https://www.repeattree.com/dashboard?tab=customers'))
    const location = new URL(response.headers.get('location') ?? '')

    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('next')).toBe('/dashboard?tab=customers')
  })

  it('does not loop authenticated users back into login', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const response = await middleware(new NextRequest('https://www.repeattree.com/login?next=%2Flogin'))

    expect(response.headers.get('location')).toBe('https://www.repeattree.com/dashboard')
  })
})
