export type HealthStatus = 'ok' | 'warn' | 'fail' | 'skipped'

type EnvSource = Record<string, string | undefined>

type EnvServiceDefinition = {
  id: string
  label: string
  required: string[]
  optional?: string[]
  validate?: (env: EnvSource) => string[]
}

export type EnvServiceCheck = {
  id: string
  label: string
  status: Exclude<HealthStatus, 'skipped'>
  missingRequired: string[]
  missingOptional: string[]
  invalid: string[]
}

export type LiveServiceCheck = {
  id: string
  label: string
  status: HealthStatus
  detail: string
}

export type ProductionHealthReport = {
  status: Exclude<HealthStatus, 'skipped'>
  checkedAt: string
  environment: {
    status: Exclude<HealthStatus, 'skipped'>
    services: EnvServiceCheck[]
  }
  live: LiveServiceCheck[]
}

const envServiceDefinitions: EnvServiceDefinition[] = [
  {
    id: 'app',
    label: 'Application runtime',
    required: ['NEXT_PUBLIC_APP_URL'],
    optional: ['HEALTHCHECK_SECRET', 'ALLOW_LOCAL_DEMO_MODE', 'NEXT_PUBLIC_ALLOW_LOCAL_DEMO_MODE'],
    validate: (env) => [
      ...validateUrl(env, 'NEXT_PUBLIC_APP_URL'),
      ...validateDemoModeDisabledOutsideLocal(env),
    ],
  },
  {
    id: 'supabase',
    label: 'Supabase Auth',
    required: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    validate: (env) => [
      ...validateUrl(env, 'NEXT_PUBLIC_SUPABASE_URL'),
      ...validateNotPlaceholder(env, 'NEXT_PUBLIC_SUPABASE_URL', 'example.supabase.co'),
    ],
  },
  {
    id: 'prisma',
    label: 'Prisma Postgres',
    required: ['DATABASE_URL', 'DIRECT_URL'],
    validate: (env) => [
      ...validatePostgresUrl(env, 'DATABASE_URL'),
      ...validatePostgresUrl(env, 'DIRECT_URL'),
    ],
  },
  {
    id: 'redis',
    label: 'Redis / Upstash',
    required: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
    validate: (env) => validateUrl(env, 'UPSTASH_REDIS_REST_URL'),
  },
  {
    id: 'inngest',
    label: 'Inngest',
    required: ['INNGEST_EVENT_KEY', 'INNGEST_SIGNING_KEY'],
  },
  {
    id: 'stripe',
    label: 'Stripe billing',
    required: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_STARTER', 'STRIPE_PRICE_GROWTH', 'STRIPE_PRICE_SCALE'],
  },
  {
    id: 'resend',
    label: 'Resend transactional email',
    required: ['RESEND_API_KEY', 'RESEND_FROM_EMAIL'],
  },
  {
    id: 'posthog',
    label: 'PostHog analytics',
    required: ['POSTHOG_KEY'],
    optional: ['POSTHOG_HOST'],
    validate: (env) => validateUrl(env, 'POSTHOG_HOST'),
  },
  {
    id: 'sentry',
    label: 'Sentry observability',
    required: ['SENTRY_DSN', 'NEXT_PUBLIC_SENTRY_DSN'],
    optional: ['SENTRY_TRACES_SAMPLE_RATE', 'NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE'],
  },
  {
    id: 'jobs',
    label: 'Cron and integration webhooks',
    required: ['CRON_SECRET', 'INTEGRATION_WEBHOOK_SECRET'],
  },
]

export function checkProductionEnv(env: EnvSource = process.env) {
  const services = envServiceDefinitions.map((service) => {
    const missingRequired = service.required.filter((name) => !hasEnvValue(env, name))
    const missingOptional = (service.optional ?? []).filter((name) => !hasEnvValue(env, name))
    const invalid = service.validate?.(env) ?? []

    return {
      id: service.id,
      label: service.label,
      status: missingRequired.length > 0 || invalid.length > 0 ? 'fail' : 'ok',
      missingRequired,
      missingOptional,
      invalid,
    } satisfies EnvServiceCheck
  })

  return {
    status: services.some((service) => service.status === 'fail') ? 'fail' : 'ok',
    services,
  } satisfies ProductionHealthReport['environment']
}

export async function runProductionHealthChecks({
  env = process.env,
  includeLiveChecks = false,
}: {
  env?: EnvSource
  includeLiveChecks?: boolean
} = {}): Promise<ProductionHealthReport> {
  const environment = checkProductionEnv(env)
  const live = includeLiveChecks ? await runLiveChecks(environment) : []
  const hasLiveFailure = live.some((check) => check.status === 'fail')
  const status = environment.status === 'fail' || hasLiveFailure ? 'fail' : 'ok'

  return {
    status,
    checkedAt: new Date().toISOString(),
    environment,
    live,
  }
}

export function publicHealthSummary(report: ProductionHealthReport) {
  const failedEnvServices = report.environment.services.filter((service) => service.status === 'fail').length
  const failedLiveServices = report.live.filter((service) => service.status === 'fail').length

  return {
    status: report.status,
    checkedAt: report.checkedAt,
    environment: {
      status: report.environment.status,
      configuredServices: report.environment.services.length - failedEnvServices,
      failedServices: failedEnvServices,
    },
    live: {
      checkedServices: report.live.length,
      failedServices: failedLiveServices,
    },
  }
}

async function runLiveChecks(environment: ProductionHealthReport['environment']) {
  const checks: LiveServiceCheck[] = []

  checks.push(await checkDatabase(environment))
  checks.push(await checkRedis(environment))
  checks.push(await checkStripe(environment))

  return checks
}

async function checkDatabase(environment: ProductionHealthReport['environment']): Promise<LiveServiceCheck> {
  if (envServiceFailed(environment, 'prisma')) {
    return skippedLiveCheck('prisma', 'Prisma Postgres', 'database env is not fully configured')
  }

  try {
    const { prisma } = await import('./prisma')
    await prisma.$queryRawUnsafe('SELECT 1')
    return { id: 'prisma', label: 'Prisma Postgres', status: 'ok', detail: 'database query succeeded' }
  } catch (error) {
    return failedLiveCheck('prisma', 'Prisma Postgres', error)
  }
}

async function checkRedis(environment: ProductionHealthReport['environment']): Promise<LiveServiceCheck> {
  if (envServiceFailed(environment, 'redis')) {
    return skippedLiveCheck('redis', 'Redis / Upstash', 'redis env is not fully configured')
  }

  try {
    const { getRedis } = await import('./platform/redis')
    const redis = getRedis()
    if (!redis) return skippedLiveCheck('redis', 'Redis / Upstash', 'redis client is not configured')

    await redis.ping()
    return { id: 'redis', label: 'Redis / Upstash', status: 'ok', detail: 'redis ping succeeded' }
  } catch (error) {
    return failedLiveCheck('redis', 'Redis / Upstash', error)
  }
}

async function checkStripe(environment: ProductionHealthReport['environment']): Promise<LiveServiceCheck> {
  if (envServiceFailed(environment, 'stripe')) {
    return skippedLiveCheck('stripe', 'Stripe billing', 'stripe env is not fully configured')
  }

  try {
    const { getStripe } = await import('./platform/stripe')
    const stripe = getStripe()
    if (!stripe) return skippedLiveCheck('stripe', 'Stripe billing', 'stripe client is not configured')

    await stripe.balance.retrieve()
    return { id: 'stripe', label: 'Stripe billing', status: 'ok', detail: 'stripe API request succeeded' }
  } catch (error) {
    return failedLiveCheck('stripe', 'Stripe billing', error)
  }
}

function envServiceFailed(environment: ProductionHealthReport['environment'], id: string) {
  return environment.services.find((service) => service.id === id)?.status === 'fail'
}

function skippedLiveCheck(id: string, label: string, detail: string): LiveServiceCheck {
  return { id, label, status: 'skipped', detail }
}

function failedLiveCheck(id: string, label: string, error: unknown): LiveServiceCheck {
  return {
    id,
    label,
    status: 'fail',
    detail: error instanceof Error ? error.message : 'unknown service error',
  }
}

function hasEnvValue(env: EnvSource, name: string) {
  return Boolean(env[name]?.trim())
}

function validateUrl(env: EnvSource, name: string) {
  const value = env[name]?.trim()
  if (!value) return []

  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) return [`${name} must use http or https.`]
    return []
  } catch {
    return [`${name} must be a valid URL.`]
  }
}

function validatePostgresUrl(env: EnvSource, name: string) {
  const value = env[name]?.trim()
  if (!value) return []

  return value.startsWith('postgresql://') || value.startsWith('postgres://')
    ? []
    : [`${name} must be a Postgres connection string.`]
}

function validateNotPlaceholder(env: EnvSource, name: string, placeholder: string) {
  const value = env[name]?.trim()
  return value?.includes(placeholder) ? [`${name} still points to ${placeholder}.`] : []
}

function validateDemoModeDisabledOutsideLocal(env: EnvSource) {
  const appUrl = env.NEXT_PUBLIC_APP_URL?.trim()
  const localDemoEnabled = env.ALLOW_LOCAL_DEMO_MODE === 'true' || env.NEXT_PUBLIC_ALLOW_LOCAL_DEMO_MODE === 'true'
  if (!appUrl || !localDemoEnabled) return []

  try {
    const hostname = new URL(appUrl).hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return []
  } catch {
    return []
  }

  return ['Local demo mode must be disabled outside localhost.']
}
