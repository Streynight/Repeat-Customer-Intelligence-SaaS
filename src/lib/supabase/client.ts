import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { allowsLocalDemoMode, hasSupabaseRuntimeConfig } from '@/lib/runtime-config'

let browserClient: SupabaseClient | null = null

export function createClient() {
  if (!hasSupabaseRuntimeConfig() && !allowsLocalDemoMode()) {
    throw new Error('Supabase is not configured. Enable local demo mode only for local development.')
  }

  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo-key',
    )
  }

  return browserClient
}
