import { describe, expect, it, vi } from 'vitest'
import {
  normalizeStripePlan,
  normalizeStripeStatus,
  syncCheckoutSessionToBilling,
  syncSubscriptionToBilling,
} from '@/lib/billing/stripe-webhook'

describe('stripe webhook billing sync', () => {
  it('normalizes unsupported plans and statuses to safe defaults', () => {
    expect(normalizeStripePlan('growth')).toBe('growth')
    expect(normalizeStripePlan('unknown')).toBe('starter')
    expect(normalizeStripeStatus('paused')).toBe('past_due')
  })

  it('upserts organization billing from completed checkout sessions', async () => {
    const billingSubscription = {
      upsert: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({}),
    }

    await syncCheckoutSessionToBilling(billingSubscription, {
      customer: 'cus_123',
      metadata: { organizationId: 'org_123', plan: 'scale' },
    } as never)

    expect(billingSubscription.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: 'org_123' },
      update: expect.objectContaining({
        stripeCustomerId: 'cus_123',
        plan: 'scale',
        monthlyOrderLimit: 1_000_000,
      }),
    }))
  })

  it('updates subscriptions by Stripe customer id', async () => {
    const billingSubscription = {
      upsert: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({}),
    }

    await syncSubscriptionToBilling(billingSubscription, {
      id: 'sub_123',
      customer: 'cus_123',
      status: 'active',
      metadata: { plan: 'growth' },
      items: { data: [{ current_period_end: 1_700_000_000 }] },
    } as never)

    expect(billingSubscription.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { stripeCustomerId: 'cus_123' },
      data: expect.objectContaining({
        stripeSubscriptionId: 'sub_123',
        status: 'active',
        plan: 'growth',
        workspaceLimit: 3,
      }),
    }))
  })
})
