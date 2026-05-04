type EnvSource = Record<string, string | undefined>

const demoSupabaseUrl = 'https://example.supabase.co'
const demoSupabaseAnonKey = 'demo-key'

export function hasSupabaseRuntimeConfig(env: EnvSource = process.env) {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() &&
      !env.NEXT_PUBLIC_SUPABASE_URL.includes('example.supabase.co') &&
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== demoSupabaseAnonKey,
  )
}

export function getSupabaseRuntimeConfig(env: EnvSource = process.env) {
  if (hasSupabaseRuntimeConfig(env)) {
    return {
      supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
      supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
    }
  }

  if (allowsLocalDemoMode(env)) {
    return {
      supabaseUrl: demoSupabaseUrl,
      supabaseAnonKey: demoSupabaseAnonKey,
    }
  }

  throw new Error('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
}

export function allowsLocalDemoMode(env: EnvSource = process.env) {
  const enabled = env.ALLOW_LOCAL_DEMO_MODE === 'true' || env.NEXT_PUBLIC_ALLOW_LOCAL_DEMO_MODE === 'true'
  if (!enabled || env.NODE_ENV === 'production') return false

  const appUrl = env.NEXT_PUBLIC_APP_URL?.trim()
  if (!appUrl) return true

  try {
    const hostname = new URL(appUrl).hostname
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  } catch {
    return false
  }
}

export function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required for this production feature.`)
  }

  return value
}
