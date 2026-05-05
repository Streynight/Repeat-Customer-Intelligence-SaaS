import { describe, expect, it } from 'vitest'
import { isWithinPlanLimit, planCatalog, planLimits, stripePriceEnvForPlan } from '@/lib/billing/plans'

describe('billing plans', () => {
  it('defines paid plan limits for usage enforcement', () => {
    expect(planLimits.growth.monthlyOrders).toBeGreaterThan(planLimits.starter.monthlyOrders)
    expect(planLimits.scale.nativeIntegrations).toBeGreaterThanOrEqual(planLimits.growth.nativeIntegrations)
    expect(planLimits.scale.databaseStorageMb).toBeGreaterThan(planLimits.growth.databaseStorageMb)
  })

  it('uses market-adjusted monthly pricing for self-serve plans', () => {
    expect(planCatalog.starter.priceMonthlyThb).toBe(1_790)
    expect(planCatalog.growth.priceMonthlyThb).toBe(5_390)
    expect(planCatalog.scale.priceMonthlyThb).toBe(12_900)
    expect(planCatalog.enterprise.priceMonthlyThb).toBeNull()
  })

  it('starts self-serve plans with a free trial', () => {
    expect(planCatalog.starter.trialDays).toBe(14)
    expect(planCatalog.growth.trialDays).toBe(14)
    expect(planCatalog.scale.trialDays).toBe(14)
    expect(planCatalog.enterprise.trialDays).toBe(0)
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
