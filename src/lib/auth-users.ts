import { prisma } from '@/lib/prisma'

const USERNAME_PATTERN = /^[a-z0-9_-]{3,32}$/

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

export function validateUsername(value: string) {
  const username = normalizeUsername(value)

  if (!USERNAME_PATTERN.test(username)) {
    return {
      username,
      error: 'Username must be 3-32 characters and use only letters, numbers, _ or -.',
    }
  }

  return { username, error: '' }
}

function usernameFromEmail(email: string) {
  const [localPart] = email.split('@')
  const base = normalizeUsername(localPart ?? '')
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')

  if (base.length >= 3) return base.slice(0, 28)
  return `user-${base || 'acct'}`
}

export async function createAvailableUsername(email: string) {
  const base = usernameFromEmail(email)
  let candidate = base
  let suffix = 1

  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    const suffixText = String(suffix)
    candidate = `${base.slice(0, 32 - suffixText.length - 1)}-${suffixText}`
    suffix += 1
  }

  return candidate
}
