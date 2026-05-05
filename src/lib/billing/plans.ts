export type PlanId = 'starter' | 'growth' | 'scale' | 'enterprise'

export type PlanLimits = {
  monthlyOrders: number
  workspaces: number
  users: number
  nativeIntegrations: number
  databaseStorageMb: number
}

export type PlanCatalogEntry = PlanLimits & {
  name: string
  priceMonthlyThb: number | null
  trialDays: number
  positioning: string
  features: string[]
}

export const orderedPlans = ['starter', 'growth', 'scale', 'enterprise'] as const satisfies readonly PlanId[]
export const selfServeTrialDays = 14

export const planCatalog: Record<PlanId, PlanCatalogEntry> = {
  starter: {
    name: 'Starter',
    priceMonthlyThb: 1_790,
    trialDays: selfServeTrialDays,
    positioning: 'For small shops validating repeat-customer work.',
    monthlyOrders: 5_000,
    workspaces: 1,
    users: 3,
    nativeIntegrations: 2,
    databaseStorageMb: 512,
    features: ['CSV/XLSX marketplace imports', 'Repeat dashboard', 'Project collaboration'],
  },
  growth: {
    name: 'Growth',
    priceMonthlyThb: 5_390,
    trialDays: selfServeTrialDays,
    positioning: 'For growing teams importing orders every week.',
    monthlyOrders: 25_000,
    workspaces: 3,
    users: 10,
    nativeIntegrations: 6,
    databaseStorageMb: 2_048,
    features: ['More order volume', 'More teammates', 'Native integration headroom'],
  },
  scale: {
    name: 'Scale',
    priceMonthlyThb: 12_900,
    trialDays: selfServeTrialDays,
    positioning: 'For multi-channel operators with serious retention volume.',
    monthlyOrders: 100_000,
    workspaces: 10,
    users: 50,
    nativeIntegrations: 9,
    databaseStorageMb: 10_240,
    features: ['High-volume imports', 'More stores and workspaces', 'Priority operating capacity'],
  },
  enterprise: {
    name: 'Enterprise',
    priceMonthlyThb: null,
    trialDays: 0,
    positioning: 'For custom data volume, storage, and support needs.',
    monthlyOrders: 1_000_000,
    workspaces: 100,
    users: 500,
    nativeIntegrations: 9,
    databaseStorageMb: 102_400,
    features: ['Custom storage', 'Custom limits', 'Dedicated onboarding'],
  },
}

export const planLimits: Record<PlanId, PlanLimits> = Object.fromEntries(
  orderedPlans.map((plan) => {
    const { monthlyOrders, workspaces, users, nativeIntegrations, databaseStorageMb } = planCatalog[plan]
    return [plan, { monthlyOrders, workspaces, users, nativeIntegrations, databaseStorageMb }]
  }),
) as Record<PlanId, PlanLimits>

export function stripePriceEnvForPlan(plan: Exclude<PlanId, 'enterprise'>) {
  return `STRIPE_PRICE_${plan.toUpperCase()}`
}

export function isWithinPlanLimit(plan: PlanId, key: keyof PlanLimits, usage: number) {
  return usage <= planLimits[plan][key]
}
