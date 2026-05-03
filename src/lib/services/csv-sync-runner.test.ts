import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reserveImportOrderUsageForStore } from '@/lib/billing/enforcement'
import { persistImportForStore } from '@/lib/server/dataset-store'
import { runCsvSyncConnectionForStore } from '@/lib/services/csv-sync-runner'
import { runCsvSyncFromUrl } from '@/lib/services/csv-sync'

const prismaMock = vi.hoisted(() => ({
  csvSyncConnection: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  csvSyncRun: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}))

const releaseUsage = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/billing/enforcement', () => ({
  reserveImportOrderUsageForStore: vi.fn(),
}))

vi.mock('@/lib/platform/redis', () => ({
  acquireLock: vi.fn().mockResolvedValue({ acquired: true, release: vi.fn() }),
}))

vi.mock('@/lib/server/dataset-store', () => ({
  loadDatasetForStore: vi.fn().mockResolvedValue({ customers: [], orders: [], imports: [] }),
  persistImportForStore: vi.fn(),
}))

vi.mock('@/lib/services/csv-sync', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/csv-sync')>('@/lib/services/csv-sync')

  return {
    ...actual,
    runCsvSyncFromUrl: vi.fn(),
  }
})

vi.mock('@/lib/observability', () => ({
  captureOperationalError: vi.fn(),
}))

describe('csv sync runner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    releaseUsage.mockResolvedValue(undefined)
    prismaMock.csvSyncConnection.findFirst.mockResolvedValue({
      id: 'sync-1',
      storeId: 'store-1',
      name: 'Daily CSV',
      csvUrl: 'https://example.com/orders.csv',
      sourceChannel: 'csv',
      columnMapping: {},
      enabled: true,
      intervalMinutes: 60,
    })
    prismaMock.csvSyncRun.create.mockResolvedValue({ id: 'run-1' })
    prismaMock.csvSyncConnection.update.mockResolvedValue({ id: 'sync-1' })
    prismaMock.$transaction.mockResolvedValue([])
    vi.mocked(reserveImportOrderUsageForStore).mockResolvedValue({ release: releaseUsage })
    vi.mocked(persistImportForStore).mockResolvedValue(undefined)
    vi.mocked(runCsvSyncFromUrl).mockResolvedValue({
      dataset: { customers: [], orders: [], imports: [], vipThreshold: 5000 },
      run: {
        connectionId: 'sync-1',
        status: 'success',
        totalRows: 3,
        importedRows: 2,
        startedAt: '2026-05-01T00:00:00.000Z',
        finishedAt: '2026-05-01T00:00:01.000Z',
      },
    })
  })

  it('reserves billable order usage before persisting a successful sync', async () => {
    const result = await runCsvSyncConnectionForStore('sync-1', 'store-1')

    expect(result.status).toBe('success')
    expect(reserveImportOrderUsageForStore).toHaveBeenCalledWith('store-1', 2)
    expect(persistImportForStore).toHaveBeenCalledWith('store-1', expect.objectContaining({
      vipThreshold: 5000,
    }))
    expect(releaseUsage).not.toHaveBeenCalled()
  })

  it('releases reserved usage if persistence fails', async () => {
    vi.mocked(persistImportForStore).mockRejectedValueOnce(new Error('persist failed'))

    const result = await runCsvSyncConnectionForStore('sync-1', 'store-1')

    expect(result.status).toBe('failed')
    expect(releaseUsage).toHaveBeenCalledOnce()
  })
})
