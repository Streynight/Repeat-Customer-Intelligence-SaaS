import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const originalDatabaseUrl = process.env.DATABASE_URL

describe('prisma lazy client', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.DATABASE_URL
  })

  afterEach(() => {
    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl
    } else {
      delete process.env.DATABASE_URL
    }
  })

  it('does not require DATABASE_URL when the module is imported during build collection', async () => {
    await expect(import('@/lib/prisma')).resolves.toHaveProperty('prisma')
  })

  it('throws an explicit error only when the client is first used without DATABASE_URL', async () => {
    const { prisma } = await import('@/lib/prisma')

    expect(() => prisma.$queryRawUnsafe).toThrow('DATABASE_URL is required to initialize Prisma Client.')
  })
})
