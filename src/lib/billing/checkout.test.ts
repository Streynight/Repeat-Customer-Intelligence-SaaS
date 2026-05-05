import { describe, expect, it } from 'vitest'
import { parseBillingCheckoutPlan } from '@/lib/billing/checkout'

describe('billing checkout helpers', () => {
  it('accepts only self-serve checkout plans', () => {
    expect(parseBillingCheckoutPlan('starter')).toBe('starter')
    expect(parseBillingCheckoutPlan('growth')).toBe('growth')
    expect(parseBillingCheckoutPlan('scale')).toBe('scale')
    expect(parseBillingCheckoutPlan('enterprise')).toBeNull()
    expect(parseBillingCheckoutPlan('unknown')).toBeNull()
    expect(parseBillingCheckoutPlan(null)).toBeNull()
  })
})
