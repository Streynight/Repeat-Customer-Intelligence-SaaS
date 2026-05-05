import { beforeEach, describe, expect, it, vi } from 'vitest'
import { estimateOrganizationDatabaseStorage } from '@/lib/billing/storage'

const prismaMock = vi.hoisted(() => ({
  customerProfile: { count: vi.fn() },
  order: { count: vi.fn() },
  orderItem: { count: vi.fn() },
  import: { count: vi.fn() },
  csvSyncConnection: { count: vi.fn() },
  csvSyncRun: { count: vi.fn() },
  integrationConnection: { count: vi.fn() },
  ingestionJob: { count: vi.fn() },
  rawEvent: { count: vi.fn() },
  normalizedOrder: { count: vi.fn() },
  customerIdentity: { count: vi.fn() },
  customerMetricSnapshot: { count: vi.fn() },
  cohortMetric: { count: vi.fn() },
  channelAttribution: { count: vi.fn() },
  segment: { count: vi.fn() },
  recommendation: { count: vi.fn() },
  automationRule: { count: vi.fn() },
  automationEvent: { count: vi.fn() },
  project: { count: vi.fn() },
  projectShare: { count: vi.fn() },
  projectTask: { count: vi.fn() },
  auditLog: { count: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

describe('database storage estimates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.values(prismaMock).forEach((delegate) => {
      delegate.count.mockResolvedValue(0)
    })
  })

  it('estimates tenant storage from organization-scoped row counts', async () => {
    prismaMock.customerProfile.count.mockResolvedValueOnce(100)
    prismaMock.order.count.mockResolvedValueOnce(1_000)
    prismaMock.orderItem.count.mockResolvedValueOnce(2_000)
    prismaMock.rawEvent.count.mockResolvedValueOnce(50)
    prismaMock.projectTask.count.mockResolvedValueOnce(10)

    const estimate = await estimateOrganizationDatabaseStorage('org-1')

    expect(estimate.rows).toMatchObject({
      customerProfile: 100,
      order: 1_000,
      orderItem: 2_000,
      rawEvent: 50,
      projectTask: 10,
    })
    expect(estimate.estimatedKb).toBe(4_710)
    expect(estimate.estimatedMb).toBe(5)
    expect(prismaMock.customerProfile.count).toHaveBeenCalledWith({
      where: { store: { workspace: { organizationId: 'org-1' } } },
    })
  })
})
