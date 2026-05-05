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
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    }

    const result = await syncCheckoutSessionToBilling(billingSubscription, {
      customer: 'cus_123',
      metadata: { organizationId: 'org_123', plan: 'scale' },
    } as never)

    expect(billingSubscription.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: 'org_123' },
      update: expect.objectContaining({
        stripeCustomerId: 'cus_123',
        plan: 'scale',
        monthlyOrderLimit: 100_000,
        databaseStorageMbLimit: 10_240,
      }),
    }))
    expect(result).toEqual({ action: 'checkout_synced', organizationId: 'org_123', plan: 'scale' })
  })

  it('updates subscriptions by Stripe customer id', async () => {
    const billingSubscription = {
      upsert: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    }

    const result = await syncSubscriptionToBilling(billingSubscription, {
      id: 'sub_123',
      customer: 'cus_123',
      status: 'active',
      metadata: { plan: 'growth' },
      trial_end: null,
      items: { data: [{ current_period_end: 1_700_000_000 }] },
    } as never)

    expect(billingSubscription.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { stripeCustomerId: 'cus_123' },
      data: expect.objectContaining({
        stripeSubscriptionId: 'sub_123',
        status: 'active',
        plan: 'growth',
        workspaceLimit: 3,
        databaseStorageMbLimit: 2_048,
        currentPeriodEnd: new Date(1_700_000_000 * 1000),
      }),
    }))
    expect(result).toEqual({
      action: 'subscription_synced',
      customerId: 'cus_123',
      plan: 'growth',
      status: 'active',
    })
  })

  it('reports unmatched subscription updates for operational monitoring', async () => {
    const billingSubscription = {
      upsert: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    }

    const result = await syncSubscriptionToBilling(billingSubscription, {
      id: 'sub_123',
      customer: 'cus_missing',
      status: 'active',
      metadata: { plan: 'growth' },
      trial_end: null,
      items: { data: [] },
    } as never)

    expect(result.action).toBe('subscription_unmatched')
  })

  it('stores trial end as the subscription period while trialing', async () => {
    const billingSubscription = {
      upsert: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    }

    await syncSubscriptionToBilling(billingSubscription, {
      id: 'sub_trial',
      customer: 'cus_123',
      status: 'trialing',
      metadata: { plan: 'starter' },
      trial_end: 1_701_000_000,
      items: { data: [{ current_period_end: 1_800_000_000 }] },
    } as never)

    expect(billingSubscription.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'trialing',
        currentPeriodEnd: new Date(1_701_000_000 * 1000),
      }),
    }))
  })
})
