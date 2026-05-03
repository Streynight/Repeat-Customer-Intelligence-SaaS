import { describe, expect, it } from 'vitest'
import { checkProductionEnv, publicHealthSummary, runProductionHealthChecks } from '@/lib/production-health'

const completeEnv = {
  NEXT_PUBLIC_APP_URL: 'https://app.repeattree.test',
  NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  DATABASE_URL: 'postgresql://user:pass@db.test:5432/app',
  DIRECT_URL: 'postgresql://user:pass@db.test:5432/app',
  UPSTASH_REDIS_REST_URL: 'https://redis.test',
  UPSTASH_REDIS_REST_TOKEN: 'redis-token',
  INNGEST_EVENT_KEY: 'inngest-event',
  INNGEST_SIGNING_KEY: 'inngest-signing',
  STRIPE_SECRET_KEY: 'stripe-secret',
  STRIPE_WEBHOOK_SECRET: 'stripe-webhook',
  STRIPE_PRICE_STARTER: 'price_starter',
  STRIPE_PRICE_GROWTH: 'price_growth',
  STRIPE_PRICE_SCALE: 'price_scale',
  RESEND_API_KEY: 'resend',
  RESEND_FROM_EMAIL: 'support@repeattree.test',
  POSTHOG_KEY: 'posthog',
  POSTHOG_HOST: 'https://us.i.posthog.com',
  SENTRY_DSN: 'https://sentry.test/1',
  NEXT_PUBLIC_SENTRY_DSN: 'https://sentry.test/1',
  CRON_SECRET: 'cron',
  INTEGRATION_WEBHOOK_SECRET: 'integration',
}

describe('production health', () => {
  it('requires every production platform service config', () => {
    const report = checkProductionEnv({})

    expect(report.status).toBe('fail')
    expect(report.services.map((service) => service.id)).toEqual(expect.arrayContaining([
      'supabase',
      'prisma',
      'redis',
      'inngest',
      'stripe',
      'resend',
      'posthog',
      'sentry',
    ]))
  })

  it('accepts complete production config without exposing secret values', async () => {
    const report = await runProductionHealthChecks({ env: completeEnv })
    const summary = publicHealthSummary(report)

    expect(report.status).toBe('ok')
    expect(summary.environment.failedServices).toBe(0)
    expect(JSON.stringify(report)).not.toContain('stripe-secret')
    expect(JSON.stringify(report)).not.toContain('redis-token')
  })
})
