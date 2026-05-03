'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAvailableUsername, normalizeUsername, validateUsername } from '@/lib/auth-users'
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
}: {
  username: string
  email: string
  password: string
}): Promise<AuthResult> {
  if (!hasSupabaseConfig()) {
    return { error: 'Authentication is not configured for this environment.' }
  }

  const { username, error: usernameError } = validateUsername(rawUsername)
  const email = rawEmail.trim().toLowerCase()

  if (usernameError) return { error: usernameError }
  if (!email || !email.includes('@')) return { error: 'Please enter a valid email address.' }
  if (password.length < 6) return { error: 'Password must be at least 6 characters.' }

  const usernameLookup = await safeAuthRead(() => prisma.user.findUnique({ where: { username } }))
  if (usernameLookup.error) return { error: usernameLookup.error }
  const existingUsername = usernameLookup.data
  if (existingUsername) return { error: 'That username is already taken.' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/callback?next=/dashboard`,
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

  redirect('/dashboard')
}

export async function signInWithPassword({
  identifier: rawIdentifier,
  password,
}: {
  identifier: string
  password: string
}): Promise<AuthResult> {
  if (!hasSupabaseConfig()) {
    return { error: 'Authentication is not configured for this environment.' }
  }

  const identifier = rawIdentifier.trim().toLowerCase()
  if (!identifier || !password) return { error: 'Enter your username or email and password.' }

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

  redirect('/dashboard')
}

export async function signInWithGoogle() {
  if (!hasSupabaseConfig()) {
    redirect('/login?error=auth_not_configured')
  }

  const headerStore = await headers()
  const origin = headerStore.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=/dashboard`,
      scopes: 'openid email profile',
    },
  })

  if (error || !data.url) {
    redirect('/login?error=oauth_failed')
  }

  redirect(data.url)
}

export async function ensureAuthUserProfile(userId: string, email: string) {
  try {
    const existing = await prisma.user.findUnique({ where: { id: userId } })
    if (existing) {
      await prisma.user.update({ where: { id: userId }, data: { email } })
      return existing
    }

    const username = await createAvailableUsername(email)
    return prisma.user.create({
      data: {
        id: userId,
        email,
        username,
      },
    })
  } catch (error) {
    throw normalizeDatabaseError(error)
  }
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
