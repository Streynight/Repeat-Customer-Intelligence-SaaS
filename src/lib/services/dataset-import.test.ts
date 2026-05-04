import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reserveImportOrderUsage } from '@/lib/billing/enforcement'
import { captureOperationalError, recordTenantEvent } from '@/lib/observability'
import { loadDatasetForStore, persistImportForStore } from '@/lib/server/dataset-store'
import { importOrdersForTenant } from '@/lib/services/dataset-import'
import { queueLifecycleAutomationForDataset } from '@/lib/services/lifecycle-automation'
import type { TenantContext } from '@/lib/tenancy'
import { makeOrder } from '@/test/fixtures'

vi.mock('@/lib/server/dataset-store', () => ({
  loadDatasetForStore: vi.fn(),
  persistImportForStore: vi.fn(),
}))

vi.mock('@/lib/billing/enforcement', () => ({
  reserveImportOrderUsage: vi.fn(),
}))

vi.mock('@/lib/observability', () => ({
  captureOperationalError: vi.fn(),
  recordTenantEvent: vi.fn(),
}))

vi.mock('@/lib/services/lifecycle-automation', () => ({
  queueLifecycleAutomationForDataset: vi.fn(),
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

describe('importOrdersForTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(loadDatasetForStore).mockResolvedValue({ customers: [], orders: [], imports: [] })
    vi.mocked(persistImportForStore).mockResolvedValue(undefined)
    vi.mocked(reserveImportOrderUsage).mockResolvedValue({ release: vi.fn() })
    vi.mocked(queueLifecycleAutomationForDataset).mockResolvedValue({ queued: 0, skipped: 0 })
  })

  it('loads the tenant store and persists a server-owned dataset from order commands', async () => {
    const result = await importOrdersForTenant(context, {
      orders: [makeOrder({ externalOrderId: 'ORDER-1', sourceChannel: 'csv' })],
      fileName: 'orders.csv',
      sourceChannel: 'shopee',
      vipThreshold: 9000,
    })

    expect(loadDatasetForStore).toHaveBeenCalledWith('store-1')
    expect(reserveImportOrderUsage).toHaveBeenCalledWith(context, 1)
    expect(persistImportForStore).toHaveBeenCalledTimes(1)
    const persistedDataset = vi.mocked(persistImportForStore).mock.calls[0][1]
    expect(persistedDataset.orders[0]).toMatchObject({
      externalOrderId: 'ORDER-1',
      sourceChannel: 'shopee',
    })
    expect(result).not.toHaveProperty('vipThreshold')
    expect(recordTenantEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: 'dataset_import_persisted',
      tenant: context,
    }))
    expect(queueLifecycleAutomationForDataset).toHaveBeenCalledWith(context, persistedDataset, { source: 'dataset_import' })
  })

  it('rejects oversized server action imports before persistence', async () => {
    await expect(importOrdersForTenant(context, {
      orders: Array.from({ length: 5001 }, (_, index) => makeOrder({ externalOrderId: `ORDER-${index}` })),
      fileName: 'too-large.csv',
      sourceChannel: 'csv',
    })).rejects.toThrow('Import is limited')

    expect(persistImportForStore).not.toHaveBeenCalled()
  })

  it('releases reserved order usage when persistence fails', async () => {
    const release = vi.fn().mockResolvedValue(undefined)
    vi.mocked(reserveImportOrderUsage).mockResolvedValue({ release })
    vi.mocked(persistImportForStore).mockRejectedValue(new Error('database write failed'))

    await expect(importOrdersForTenant(context, {
      orders: [makeOrder({ externalOrderId: 'ORDER-2' })],
      fileName: 'orders.csv',
      sourceChannel: 'csv',
    })).rejects.toThrow('database write failed')

    expect(release).toHaveBeenCalledTimes(1)
  })

  it('keeps persisted imports when lifecycle automation enqueue fails', async () => {
    const automationError = new Error('inngest unavailable')
    vi.mocked(queueLifecycleAutomationForDataset).mockRejectedValue(automationError)

    await expect(importOrdersForTenant(context, {
      orders: [makeOrder({ externalOrderId: 'ORDER-3' })],
      fileName: 'orders.csv',
      sourceChannel: 'website',
    })).resolves.toEqual(expect.objectContaining({ orders: expect.any(Array) }))

    expect(persistImportForStore).toHaveBeenCalledTimes(1)
    expect(captureOperationalError).toHaveBeenCalledWith(automationError, expect.objectContaining({
      operation: 'automation.lifecycle.queue',
      tenant: context,
    }))
    expect(recordTenantEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: 'lifecycle_automation_queue_failed',
      tenant: context,
      properties: expect.objectContaining({ sourceChannel: 'website' }),
    }))
  })
})
