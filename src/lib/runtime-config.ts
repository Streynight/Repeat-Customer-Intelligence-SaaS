export function hasSupabaseRuntimeConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('example.supabase.co'),
  )
}

export function allowsLocalDemoMode() {
  return process.env.ALLOW_LOCAL_DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_ALLOW_LOCAL_DEMO_MODE === 'true'
}

export function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required for this production feature.`)
  }

  return value
}
