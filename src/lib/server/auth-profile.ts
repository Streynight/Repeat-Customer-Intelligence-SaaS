import { createAvailableUsername } from '@/lib/auth-users'
import { normalizeDatabaseError } from '@/lib/database-errors'
import { prisma } from '@/lib/prisma'

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
