'use server'

import { redirect } from 'next/navigation'
import { appUrl } from '@/lib/app-url'
import { safeAuthRedirectPath } from '@/lib/auth-redirect'
import { normalizeUsername, validateUsername } from '@/lib/auth-users'
import { databaseUnavailableMessage, normalizeDatabaseError } from '@/lib/database-errors'
import { prisma } from '@/lib/prisma'
import { hasSupabaseRuntimeConfig } from '@/lib/runtime-config'
import { createClient } from '@/lib/supabase/server'

type AuthResult = {
  error: string
}

function hasSupabaseConfig() {
  return hasSupabaseRuntimeConfig()
}

function friendlyAuthError(message: string) {
  const normalized = message.toLowerCase()

  if (normalized.includes('invalid login credentials')) {
    return 'Username, email, or password is incorrect.'
  }

  if (normalized.includes('already registered') || normalized.includes('already exists')) {
    return 'An account with this email already exists.'
  }

  if (normalized.includes('password')) {
    return message
  }

  if (normalized.includes('fetch') || normalized.includes('not configured')) {
    return 'Authentication is not configured for this environment.'
  }

  return message || 'Authentication failed. Please try again.'
}

export async function signUpWithPassword({
  username: rawUsername,
  email: rawEmail,
  password,
  nextPath,
}: {
  username: string
  email: string
  password: string
  nextPath?: string
}): Promise<AuthResult> {
  if (!hasSupabaseConfig()) {
    return { error: 'Authentication is not configured for this environment.' }
  }

  const { username, error: usernameError } = validateUsername(rawUsername)
  const email = rawEmail.trim().toLowerCase()

  if (usernameError) return { error: usernameError }
  if (!email || !email.includes('@')) return { error: 'Please enter a valid email address.' }
  if (password.length < 6) return { error: 'Password must be at least 6 characters.' }
  const redirectPath = safeAuthRedirectPath(nextPath)

  const usernameLookup = await safeAuthRead(() => prisma.user.findUnique({ where: { username } }))
  if (usernameLookup.error) return { error: usernameLookup.error }
  const existingUsername = usernameLookup.data
  if (existingUsername) return { error: 'That username is already taken.' }

  const supabase = await createClient()
  let emailRedirectTo: string
  try {
    emailRedirectTo = appUrl(`/auth/callback?next=${encodeURIComponent(redirectPath)}`)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Application URL is not configured.' }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
    },
  })

  if (error) return { error: friendlyAuthError(error.message) }
  if (!data.user) return { error: 'We could not create the account. Please try again.' }

  try {
    await prisma.user.create({
      data: {
        id: data.user.id,
        email,
        username,
      },
    })
  } catch (error) {
    if (normalizeDatabaseError(error).message === databaseUnavailableMessage) {
      return { error: databaseUnavailableMessage }
    }

    return { error: 'That username or email is already connected to another account.' }
  }

  redirect(redirectPath)
}

export async function signInWithPassword({
  identifier: rawIdentifier,
  password,
  nextPath,
}: {
  identifier: string
  password: string
  nextPath?: string
}): Promise<AuthResult> {
  if (!hasSupabaseConfig()) {
    return { error: 'Authentication is not configured for this environment.' }
  }

  const identifier = rawIdentifier.trim().toLowerCase()
  if (!identifier || !password) return { error: 'Enter your username or email and password.' }
  const redirectPath = safeAuthRedirectPath(nextPath)

  let email = identifier
  if (!identifier.includes('@')) {
    const username = normalizeUsername(identifier)
    const userLookup = await safeAuthRead(() => prisma.user.findUnique({ where: { username } }))
    if (userLookup.error) return { error: userLookup.error }
    const user = userLookup.data
    if (!user) return { error: 'Username, email, or password is incorrect.' }
    email = user.email
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: friendlyAuthError(error.message) }

  redirect(redirectPath)
}

export async function signInWithGoogle(nextPath?: string) {
  if (!hasSupabaseConfig()) {
    redirect('/login?error=auth_not_configured')
  }

  const redirectPath = safeAuthRedirectPath(nextPath)
  let redirectTo: string
  try {
    redirectTo = appUrl(`/auth/callback?next=${encodeURIComponent(redirectPath)}`)
  } catch {
    redirect('/login?error=app_url_not_configured')
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      scopes: 'openid email profile',
    },
  })

  if (error || !data.url) {
    redirect('/login?error=oauth_failed')
  }

  redirect(data.url)
}
async function safeAuthRead<T>(read: () => Promise<T>) {
  try {
    return { data: await read(), error: null }
  } catch (error) {
    if (normalizeDatabaseError(error).message === databaseUnavailableMessage) {
      return { data: null as T, error: databaseUnavailableMessage }
    }

    throw error
  }
}
