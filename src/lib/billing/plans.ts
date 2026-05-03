export type PlanId = 'starter' | 'growth' | 'scale' | 'enterprise'

export type PlanLimits = {
  monthlyOrders: number
  workspaces: number
  users: number
  nativeIntegrations: number
}

export const planLimits: Record<PlanId, PlanLimits> = {
  starter: {
    monthlyOrders: 10_000,
    workspaces: 1,
    users: 3,
    nativeIntegrations: 2,
  },
  growth: {
    monthlyOrders: 100_000,
    workspaces: 3,
    users: 10,
    nativeIntegrations: 6,
  },
  scale: {
    monthlyOrders: 1_000_000,
    workspaces: 10,
    users: 50,
    nativeIntegrations: 9,
  },
  enterprise: {
    monthlyOrders: 10_000_000,
    workspaces: 100,
    users: 500,
    nativeIntegrations: 9,
  },
}

export function stripePriceEnvForPlan(plan: Exclude<PlanId, 'enterprise'>) {
  return `STRIPE_PRICE_${plan.toUpperCase()}`
}

export function isWithinPlanLimit(plan: PlanId, key: keyof PlanLimits, usage: number) {
  return usage <= planLimits[plan][key]
}
