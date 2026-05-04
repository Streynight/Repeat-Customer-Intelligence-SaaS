import { afterEach, describe, expect, it, vi } from 'vitest'
import { allowsLocalDemoMode, getSupabaseRuntimeConfig, hasSupabaseRuntimeConfig } from '@/lib/runtime-config'

describe('runtime config', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns configured Supabase runtime values', () => {
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    }

    expect(hasSupabaseRuntimeConfig(env)).toBe(true)
    expect(getSupabaseRuntimeConfig(env)).toEqual({
      supabaseUrl: 'https://project.supabase.co',
      supabaseAnonKey: 'anon-key',
    })
  })

  it('throws explicit errors instead of silently using a placeholder service', () => {
    expect(() => getSupabaseRuntimeConfig({})).toThrow(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    )

    expect(() =>
      getSupabaseRuntimeConfig({
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'demo-key',
      }),
    ).toThrow('Supabase is not configured.')
  })

  it('allows demo Supabase config only for explicit non-production local mode', () => {
    const env = {
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NEXT_PUBLIC_ALLOW_LOCAL_DEMO_MODE: 'true',
    }

    expect(allowsLocalDemoMode(env)).toBe(true)
    expect(getSupabaseRuntimeConfig(env)).toEqual({
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'demo-key',
    })
  })

  it('blocks demo mode in production even when the flag is set', () => {
    vi.stubEnv('NODE_ENV', 'production')

    expect(
      allowsLocalDemoMode({
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
        NEXT_PUBLIC_ALLOW_LOCAL_DEMO_MODE: 'true',
        NODE_ENV: 'production',
      }),
    ).toBe(false)
  })
})
