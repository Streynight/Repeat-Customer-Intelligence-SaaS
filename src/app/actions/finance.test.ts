import { beforeEach, describe, expect, it, vi } from 'vitest'
import { recordTenantEvent } from '@/lib/observability'
import { testCsvSyncUrl } from '@/lib/services/csv-sync'
import { createCsvSyncConnection, deleteCsvSyncConnection, updateCsvSyncConnection } from '@/app/actions/finance'
import type { TenantContext } from '@/lib/tenancy'

const prismaMock = vi.hoisted(() => ({
  store: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  csvSyncConnection: {
    create: vi.fn(),
    delete: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  csvSyncRun: {
    findMany: vi.fn(),
  },
}))

const context = vi.hoisted(() => ({
  userId: 'user-1',
  email: 'owner@store.com',
  organizationId: 'org-1',
  workspaceId: 'workspace-1',
  storeId: 'store-1',
  role: 'owner',
  permissions: ['manageIntegrations', 'manageImports', 'manageWorkspace'],
} satisfies TenantContext))

const csvSyncConnection = {
  id: 'sync-1',
  name: 'Shopee sync',
  csvUrl: 'https://example.com/orders.csv',
  sourceChannel: 'shopee' as const,
  columnMapping: {},
  enabled: true,
  intervalMinutes: 60,
  lastSyncStatus: null,
  lastSyncError: null,
  lastSyncedAt: null,
  createdAt: new Date('2026-05-01T00:00:00.000Z'),
}

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/tenancy', () => ({
  getTenantContext: vi.fn().mockResolvedValue(context),
  requireTenantContext: vi.fn().mockResolvedValue(context),
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/services/csv-sync', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/csv-sync')>('@/lib/services/csv-sync')

  return {
    ...actual,
    testCsvSyncUrl: vi.fn().mockResolvedValue({
      totalRows: 1,
      importableRows: 1,
      errors: [],
      canImport: true,
    }),
  }
})

vi.mock('@/lib/services/csv-sync-runner', () => ({
  runCsvSyncConnectionForStore: vi.fn(),
}))

vi.mock('@/lib/observability', () => ({
  recordTenantEvent: vi.fn(),
}))

describe('finance server actions observability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.csvSyncConnection.create.mockResolvedValue(csvSyncConnection)
    prismaMock.csvSyncConnection.findFirst.mockResolvedValue({ id: 'sync-1' })
    prismaMock.csvSyncConnection.update.mockResolvedValue({
      ...csvSyncConnection,
      enabled: false,
    })
    prismaMock.csvSyncConnection.delete.mockResolvedValue(csvSyncConnection)
  })

  it('records product telemetry when creating a CSV sync connection', async () => {
    await createCsvSyncConnection({
      name: 'Shopee sync',
      csvUrl: 'https://example.com/orders.csv',
      sourceChannel: 'shopee',
    })

    expect(testCsvSyncUrl).toHaveBeenCalledWith('https://example.com/orders.csv', 'shopee', expect.any(Object))
    expect(recordTenantEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: 'csv_sync_connection_created',
      tenant: context,
      properties: expect.objectContaining({
        connectionId: 'sync-1',
        sourceChannel: 'shopee',
        enabled: true,
      }),
    }))
  })

  it('records product telemetry when updating and deleting CSV sync connections', async () => {
    await updateCsvSyncConnection({ id: 'sync-1', enabled: false })
    await deleteCsvSyncConnection('sync-1')

    expect(recordTenantEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: 'csv_sync_connection_updated',
      tenant: context,
      properties: expect.objectContaining({
        connectionId: 'sync-1',
        enabled: false,
        updatedFields: ['enabled'],
      }),
    }))
    expect(recordTenantEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: 'csv_sync_connection_deleted',
      tenant: context,
      properties: { connectionId: 'sync-1' },
    }))
  })
})
