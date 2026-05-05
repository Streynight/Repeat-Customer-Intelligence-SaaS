import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadBillingOverview } from '@/app/actions/billing'

const prismaMock = vi.hoisted(() => ({
  billingSubscription: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}))

const tenantContext = vi.hoisted(() => ({
  userId: 'user-1',
  email: 'owner@store.com',
  organizationId: 'org-1',
  workspaceId: 'workspace-1',
  storeId: 'store-1',
  role: 'owner',
  permissions: ['readAnalytics'],
}))

const requireTenantContextMock = vi.hoisted(() => vi.fn())
const estimateOrganizationDatabaseStorageMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/tenancy', () => ({
  requireTenantContext: requireTenantContextMock,
  writeAuditLog: vi.fn(),
}))

vi.mock('@/lib/billing/storage', () => ({
  estimateOrganizationDatabaseStorage: estimateOrganizationDatabaseStorageMock,
}))

describe('billing server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireTenantContextMock.mockResolvedValue(tenantContext)
    prismaMock.billingSubscription.findUnique.mockResolvedValue({
      plan: 'growth',
      status: 'active',
      stripeCustomerId: 'cus_123',
      monthlyOrderLimit: 10_000,
      monthlyOrderUsage: 2_500,
      databaseStorageMbLimit: 512,
      databaseStorageMbUsage: 100,
      workspaceLimit: 1,
    })
    prismaMock.billingSubscription.update.mockResolvedValue({})
    estimateOrganizationDatabaseStorageMock.mockResolvedValue({
      estimatedMb: 350,
      estimatedKb: 358_400,
      rows: {},
    })
  })

  it('loads market-adjusted plan usage and refreshes stored limits', async () => {
    const overview = await loadBillingOverview()

    expect(requireTenantContextMock).toHaveBeenCalledWith({ permission: 'readAnalytics' })
    expect(overview.current).toMatchObject({
      plan: 'growth',
      monthlyOrderLimit: 25_000,
      monthlyOrderUsage: 2_500,
      databaseStorageMbLimit: 2_048,
      databaseStorageMbUsage: 350,
      workspaceLimit: 3,
      hasStripeCustomer: true,
    })
    expect(overview.plans.map((plan) => [plan.id, plan.priceMonthlyThb, plan.trialDays])).toEqual([
      ['starter', 1_790, 0],
      ['growth', 5_390, 7],
      ['scale', 12_900, 0],
      ['enterprise', null, 0],
    ])
    expect(prismaMock.billingSubscription.update).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
      data: {
        monthlyOrderLimit: 25_000,
        workspaceLimit: 3,
        databaseStorageMbLimit: 2_048,
        databaseStorageMbUsage: 350,
      },
    })
  })
})
