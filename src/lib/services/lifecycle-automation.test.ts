import { beforeEach, describe, expect, it, vi } from 'vitest'
import { inngest } from '@/inngest/client'
import { recordTenantEvent } from '@/lib/observability'
import { queueLifecycleAutomationForDataset } from '@/lib/services/lifecycle-automation'
import type { TenantContext } from '@/lib/tenancy'
import { createEmptyDataset } from '@/lib/empty-dataset'
import { makeCustomer, makeDataset, makeOrder } from '@/test/fixtures'

vi.mock('@/inngest/client', () => ({
  inngest: {
    send: vi.fn(),
  },
}))

vi.mock('@/lib/observability', () => ({
  recordTenantEvent: vi.fn(),
}))

const context: TenantContext = {
  userId: 'user-1',
  email: 'owner@store.com',
  organizationId: 'org-1',
  workspaceId: 'workspace-1',
  storeId: 'store-1',
  role: 'owner',
  permissions: ['manageImports', 'readAnalytics'],
}

describe('queueLifecycleAutomationForDataset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(inngest.send).mockResolvedValue({ ids: ['evt_1'] })
  })

  it('queues website lifecycle signals with stable Inngest ids', async () => {
    const websiteOrder = {
      ...makeOrder({
        externalOrderId: 'WEB-1',
        sourceChannel: 'website',
        orderDate: '2026-04-20T00:00:00.000Z',
        totalAmount: 15_000,
      }),
      id: 'order-1',
      customerProfileId: 'website-vip',
    }
    const dataset = makeDataset([
      makeCustomer({
        id: 'website-vip',
        firstChannel: 'website',
        lastChannel: 'website',
        customerStatus: 'VIP',
        totalOrders: 4,
        totalSpent: 15_000,
        lastOrderDate: '2026-04-20T00:00:00.000Z',
        orders: [websiteOrder],
      }),
    ])

    const result = await queueLifecycleAutomationForDataset(context, dataset, {
      source: 'dataset_import',
      today: new Date('2026-05-03T00:00:00.000Z'),
    })

    expect(result).toEqual({ queued: 1, skipped: 0 })
    expect(inngest.send).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'lifecycle:workspace-1:customer%3Awebsite-vip%3Avip%3A15000',
        name: 'automation/lifecycle.triggered',
        data: expect.objectContaining({
          workspaceId: 'workspace-1',
          type: 'vipDetected',
          customerProfileId: 'website-vip',
          source: 'dataset_import',
        }),
      }),
    ])
    expect(recordTenantEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: 'lifecycle_automation_signals_queued',
      tenant: context,
      properties: expect.objectContaining({ queued: 1, skipped: 0 }),
    }))
  })

  it('does not send an empty automation batch', async () => {
    const result = await queueLifecycleAutomationForDataset(context, createEmptyDataset(), {
      source: 'dataset_import',
    })

    expect(result).toEqual({ queued: 0, skipped: 0 })
    expect(inngest.send).not.toHaveBeenCalled()
    expect(recordTenantEvent).not.toHaveBeenCalled()
  })
})
