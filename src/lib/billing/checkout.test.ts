import { describe, expect, it } from 'vitest'
import { billingCheckoutTrialDays, parseBillingCheckoutPlan } from '@/lib/billing/checkout'

describe('billing checkout helpers', () => {
  it('accepts only self-serve checkout plans', () => {
    expect(parseBillingCheckoutPlan('starter')).toBe('starter')
    expect(parseBillingCheckoutPlan('growth')).toBe('growth')
    expect(parseBillingCheckoutPlan('scale')).toBe('scale')
    expect(parseBillingCheckoutPlan('enterprise')).toBeNull()
    expect(parseBillingCheckoutPlan('unknown')).toBeNull()
    expect(parseBillingCheckoutPlan(null)).toBeNull()
  })

  it('uses the configured free trial for self-serve checkout plans', () => {
    expect(billingCheckoutTrialDays('starter')).toBe(0)
    expect(billingCheckoutTrialDays('growth')).toBe(7)
    expect(billingCheckoutTrialDays('scale')).toBe(0)
  })
})
