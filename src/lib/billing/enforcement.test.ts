import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  assertCanCreateNativeIntegration,
  billableStatusList,
  reserveImportOrderUsage,
  reserveImportOrderUsageForStore,
  requireBillableSubscription,
} from '@/lib/billing/enforcement'
import type { TenantContext } from '@/lib/tenancy'

const prismaMock = vi.hoisted(() => ({
  billingSubscription: {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
  store: {
    findFirst: vi.fn(),
  },
  integrationConnection: {
    count: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

const context: TenantContext = {
  userId: 'user-1',
  email: 'owner@store.com',
  organizationId: 'org-1',
  workspaceId: 'workspace-1',
  storeId: 'store-1',
  role: 'owner',
  permissions: ['manageImports', 'manageIntegrations'],
}

describe('billing enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.billingSubscription.findUnique.mockResolvedValue({
      organizationId: 'org-1',
      plan: 'starter',
      status: 'active',
      monthlyOrderLimit: 10_000,
      monthlyOrderUsage: 100,
      databaseStorageMbLimit: 512,
      databaseStorageMbUsage: 12,
    })
    prismaMock.billingSubscription.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.store.findFirst.mockResolvedValue({
      workspace: { organizationId: 'org-1' },
    })
    prismaMock.integrationConnection.count.mockResolvedValue(0)
  })

  it('requires an active or trialing subscription for production mutations', async () => {
    prismaMock.billingSubscription.findUnique.mockResolvedValueOnce({
      organizationId: 'org-1',
      plan: 'starter',
      status: 'canceled',
      monthlyOrderLimit: 10_000,
      monthlyOrderUsage: 0,
      databaseStorageMbLimit: 512,
      databaseStorageMbUsage: 0,
    })

    await expect(requireBillableSubscription(context)).rejects.toThrow('Subscription is not active')
    expect(billableStatusList()).toEqual(['active', 'trialing'])
  })

  it('reserves and can release monthly order usage atomically', async () => {
    const reservation = await reserveImportOrderUsage(context, 25)

    expect(prismaMock.billingSubscription.updateMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        status: { in: ['active', 'trialing'] },
        monthlyOrderUsage: { lte: 9975 },
      },
      data: {
        monthlyOrderUsage: { increment: 25 },
      },
    })

    await reservation.release()
    expect(prismaMock.billingSubscription.updateMany).toHaveBeenLastCalledWith({
      where: { organizationId: 'org-1' },
      data: { monthlyOrderUsage: { decrement: 25 } },
    })
  })

  it('blocks imports that exceed the current plan limit', async () => {
    prismaMock.billingSubscription.findUnique.mockResolvedValueOnce({
      organizationId: 'org-1',
      plan: 'starter',
      status: 'active',
      monthlyOrderLimit: 10_000,
      monthlyOrderUsage: 9999,
      databaseStorageMbLimit: 512,
      databaseStorageMbUsage: 12,
    })

    await expect(reserveImportOrderUsage(context, 2)).rejects.toThrow('Monthly order limit reached')
    expect(prismaMock.billingSubscription.updateMany).not.toHaveBeenCalled()
  })

  it('reserves automated import usage from the owning store organization', async () => {
    await reserveImportOrderUsageForStore('store-1', 5)

    expect(prismaMock.store.findFirst).toHaveBeenCalledWith({
      where: { id: 'store-1' },
      select: { workspace: { select: { organizationId: true } } },
    })
    expect(prismaMock.billingSubscription.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: 'org-1' }),
      data: { monthlyOrderUsage: { increment: 5 } },
    }))
  })

  it('blocks automated import usage for stores without billable tenancy', async () => {
    prismaMock.store.findFirst.mockResolvedValueOnce(null)

    await expect(reserveImportOrderUsageForStore('orphan-store', 5)).rejects.toThrow('billable organization')
    expect(prismaMock.billingSubscription.updateMany).not.toHaveBeenCalled()
  })

  it('blocks native integrations above the plan capacity', async () => {
    prismaMock.integrationConnection.count.mockResolvedValueOnce(2)

    await expect(assertCanCreateNativeIntegration(context)).rejects.toThrow('Native integration limit reached')
  })
})
