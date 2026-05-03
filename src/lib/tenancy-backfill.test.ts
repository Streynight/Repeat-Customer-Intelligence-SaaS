import { describe, expect, it } from 'vitest'
import {
  planTenancyBackfillForUser,
  slugifyTenantName,
  summarizeTenancyBackfillPlans,
} from '@/lib/tenancy-backfill'

describe('tenancy backfill planning', () => {
  it('plans full tenant creation for a legacy user without membership', () => {
    const plan = planTenancyBackfillForUser({
      userId: 'user_1',
      email: 'owner@example.com',
      hasMembership: false,
      workspaceCount: 0,
      billingSubscriptionExists: false,
      attachedStoreCount: 0,
      unattachedLegacyStoreCount: 1,
    })

    expect(plan.actions).toEqual([
      'createOrganization',
      'createDefaultWorkspace',
      'createBillingSubscription',
      'attachLegacyStores',
    ])
  })

  it('returns no actions when the same user is already migrated', () => {
    const plan = planTenancyBackfillForUser({
      userId: 'user_1',
      email: 'owner@example.com',
      hasMembership: true,
      workspaceCount: 1,
      billingSubscriptionExists: true,
      attachedStoreCount: 1,
      unattachedLegacyStoreCount: 0,
    })

    expect(plan.actions).toEqual([])
  })

  it('summarizes migration action counts for deploy review', () => {
    const summary = summarizeTenancyBackfillPlans([
      { userId: 'a', email: 'a@example.com', actions: ['createOrganization', 'createDefaultWorkspace'] },
      { userId: 'b', email: 'b@example.com', actions: [] },
    ])

    expect(summary.usersScanned).toBe(2)
    expect(summary.usersNeedingBackfill).toBe(1)
    expect(summary.actions.createOrganization).toBe(1)
    expect(summary.actions.createDefaultWorkspace).toBe(1)
  })

  it('normalizes organization slugs for stable idempotent names', () => {
    expect(slugifyTenantName('Niran Shop / Bangkok')).toBe('niran-shop-bangkok')
    expect(slugifyTenantName('')).toBe('organization')
  })
})
