import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
let modulePrisma: PrismaClient | null = null

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient()
    const value = Reflect.get(client, property)
    return typeof value === 'function' ? value.bind(client) : value
  },
})

export function getPrismaClient() {
  const cachedPrisma = process.env.NODE_ENV === 'production'
    ? modulePrisma
    : globalForPrisma.prisma

  if (cachedPrisma && hasCurrentSchemaDelegates(cachedPrisma)) {
    return cachedPrisma
  }

  if (cachedPrisma) {
    void cachedPrisma.$disconnect()
  }

  const nextPrisma = createPrismaClient()

  if (process.env.NODE_ENV === 'production') {
    modulePrisma = nextPrisma
  } else {
    globalForPrisma.prisma = nextPrisma
  }

  return nextPrisma
}

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
