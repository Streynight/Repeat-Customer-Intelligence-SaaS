import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { allowsLocalDemoMode, hasSupabaseRuntimeConfig } from '@/lib/runtime-config'

export async function createClient() {
  if (!hasSupabaseRuntimeConfig() && !allowsLocalDemoMode()) {
    throw new Error('Supabase is not configured. Enable local demo mode only for local development.')
  }

  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo-key',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    },
  )
}
