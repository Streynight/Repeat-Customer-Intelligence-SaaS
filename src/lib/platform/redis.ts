import { Redis } from '@upstash/redis'

let redis: Redis | null = null

export function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) return null
  if (!redis) redis = new Redis({ url, token })

  return redis
}

export async function acquireLock(key: string, ttlSeconds: number) {
  const client = getRedis()
  if (!client) return { acquired: true, release: async () => undefined }

  const lockKey = `lock:${key}`
  const lockValue = crypto.randomUUID()
  const acquired = await client.set(lockKey, lockValue, { nx: true, ex: ttlSeconds })

  return {
    acquired: acquired === 'OK',
    release: async () => {
      const current = await client.get(lockKey)
      if (current === lockValue) await client.del(lockKey)
    },
  }
}

export async function isIdempotencyKeyUsed(key: string, ttlSeconds = 86_400) {
  const client = getRedis()
  if (!client) return false

  const result = await client.set(`idempotency:${key}`, '1', { nx: true, ex: ttlSeconds })
  return result !== 'OK'
}
