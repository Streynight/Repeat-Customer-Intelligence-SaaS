import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

const cachedPrisma = globalForPrisma.prisma

export const prisma = cachedPrisma && hasCurrentSchemaDelegates(cachedPrisma)
  ? cachedPrisma
  : createPrismaClient()

if (cachedPrisma && cachedPrisma !== prisma) {
  void cachedPrisma.$disconnect()
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

function hasCurrentSchemaDelegates(client: PrismaClient) {
  const delegates = client as unknown as Record<string, unknown>
  return Boolean(
    delegates.csvSyncConnection &&
      delegates.csvSyncRun &&
      delegates.organization &&
      delegates.workspace &&
      delegates.membership &&
      delegates.auditLog,
  )
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is required to initialize Prisma Client.')

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  })
}
