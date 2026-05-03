import { describe, expect, it } from 'vitest'
import { isWithinPlanLimit, planLimits, stripePriceEnvForPlan } from '@/lib/billing/plans'

describe('billing plans', () => {
  it('defines paid plan limits for usage enforcement', () => {
    expect(planLimits.growth.monthlyOrders).toBeGreaterThan(planLimits.starter.monthlyOrders)
    expect(planLimits.scale.nativeIntegrations).toBeGreaterThanOrEqual(planLimits.growth.nativeIntegrations)
  })

  it('maps plans to Stripe price environment variables', () => {
    expect(stripePriceEnvForPlan('starter')).toBe('STRIPE_PRICE_STARTER')
    expect(stripePriceEnvForPlan('growth')).toBe('STRIPE_PRICE_GROWTH')
  })

  it('checks usage limits without mutating billing state', () => {
    expect(isWithinPlanLimit('starter', 'monthlyOrders', planLimits.starter.monthlyOrders)).toBe(true)
    expect(isWithinPlanLimit('starter', 'monthlyOrders', planLimits.starter.monthlyOrders + 1)).toBe(false)
  })
})
