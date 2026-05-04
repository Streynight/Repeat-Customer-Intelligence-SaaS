'use server'

import { prisma } from '@/lib/prisma'
import { isDatabaseConnectionError, normalizeDatabaseError } from '@/lib/database-errors'
import { recordTenantEvent } from '@/lib/observability'
import { defaultFinanceSettings } from '@/lib/services/finance'
import { normalizeColumnMapping, testCsvSyncUrl } from '@/lib/services/csv-sync'
import { runCsvSyncConnectionForStore } from '@/lib/services/csv-sync-runner'
import { getTenantContext, requireTenantContext, writeAuditLog } from '@/lib/tenancy'
import type { ColumnMapping } from '@/lib/services/import-pipeline'
import type { CsvSyncConnectionState, CsvSyncRunResult, FinanceSettings, SourceChannel } from '@/lib/types'

export async function loadFinanceWorkspace() {
  try {
    const storeId = await getCurrentStoreId()
    if (!storeId) return emptyFinanceWorkspace()

    const [store, connections, runs] = await Promise.all([
      prisma.store.findUnique({
        where: { id: storeId },
        select: {
          taxCountry: true,
          taxLabel: true,
          taxRate: true,
          taxIncluded: true,
        },
      }),
      prisma.csvSyncConnection.findMany({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.csvSyncRun.findMany({
        where: { storeId },
        orderBy: { startedAt: 'desc' },
        take: 8,
      }),
    ])

    return {
      settings: store ? {
        taxCountry: store.taxCountry,
        taxLabel: store.taxLabel,
        taxRate: Number(store.taxRate),
        taxIncluded: store.taxIncluded,
      } satisfies FinanceSettings : defaultFinanceSettings,
      connections: connections.map(connectionToState),
      runs: runs.map(runToResult),
    }
  } catch (error) {
    if (isDatabaseConnectionError(error)) return emptyFinanceWorkspace()
    throw normalizeDatabaseError(error)
  }
}

export async function saveFinanceSettings(settings: FinanceSettings) {
  const context = await requireTenantContext({ permission: 'manageWorkspace' })

  await prisma.store.update({
    where: { id: context.storeId },
    data: {
      taxCountry: settings.taxCountry || defaultFinanceSettings.taxCountry,
      taxLabel: settings.taxLabel || defaultFinanceSettings.taxLabel,
      taxRate: finiteOrDefault(settings.taxRate, defaultFinanceSettings.taxRate),
      taxIncluded: Boolean(settings.taxIncluded),
    },
  })

  await writeAuditLog(context, {
    action: 'finance.settings.updated',
    resourceType: 'store',
    resourceId: context.storeId,
  })
}

export async function createCsvSyncConnection(input: {
  name: string
  csvUrl: string
  sourceChannel: SourceChannel
  columnMapping?: Partial<ColumnMapping>
  intervalMinutes?: number
}) {
  const context = await requireTenantContext({ permission: 'manageIntegrations' })
  const mapping = normalizeColumnMapping(input.columnMapping)
  await testCsvSyncUrl(input.csvUrl, input.sourceChannel, mapping)

  const connection = await prisma.csvSyncConnection.create({
    data: {
      storeId: context.storeId,
      name: input.name.trim() || 'CSV sync',
      csvUrl: input.csvUrl.trim(),
      sourceChannel: input.sourceChannel,
      columnMapping: mapping,
      intervalMinutes: input.intervalMinutes ?? 60,
      enabled: true,
    },
  })

  await writeAuditLog(context, {
    action: 'integration.csv_sync.created',
    resourceType: 'csv_sync_connection',
    resourceId: connection.id,
  })
  recordTenantEvent({
    event: 'csv_sync_connection_created',
    tenant: context,
    properties: {
      connectionId: connection.id,
      sourceChannel: connection.sourceChannel,
      intervalMinutes: connection.intervalMinutes,
      enabled: connection.enabled,
    },
  })

  return connectionToState(connection)
}

export async function updateCsvSyncConnection(input: {
  id: string
  enabled?: boolean
  name?: string
  intervalMinutes?: number
}) {
  const context = await requireTenantContext({ permission: 'manageIntegrations' })
  await assertConnectionOwnership(input.id, context.storeId)
  const connection = await prisma.csvSyncConnection.update({
    where: { id: input.id },
    data: {
      enabled: input.enabled,
      name: input.name,
      intervalMinutes: input.intervalMinutes,
    },
  })

  await writeAuditLog(context, {
    action: 'integration.csv_sync.updated',
    resourceType: 'csv_sync_connection',
    resourceId: connection.id,
  })
  recordTenantEvent({
    event: 'csv_sync_connection_updated',
    tenant: context,
    properties: {
      connectionId: connection.id,
      enabled: connection.enabled,
      intervalMinutes: connection.intervalMinutes,
      updatedFields: Object.keys(input).filter((key) => key !== 'id'),
    },
  })

  return connectionToState(connection)
}

export async function deleteCsvSyncConnection(id: string) {
  const context = await requireTenantContext({ permission: 'manageIntegrations' })
  await assertConnectionOwnership(id, context.storeId)
  await prisma.csvSyncConnection.delete({ where: { id } })
  await writeAuditLog(context, {
    action: 'integration.csv_sync.deleted',
    resourceType: 'csv_sync_connection',
    resourceId: id,
  })
  recordTenantEvent({
    event: 'csv_sync_connection_deleted',
    tenant: context,
    properties: { connectionId: id },
  })
}

export async function testCsvSyncConnectionUrl(input: {
  csvUrl: string
  sourceChannel: SourceChannel
  columnMapping?: Partial<ColumnMapping>
}) {
  await requireTenantContext({ permission: 'manageIntegrations' })
  return testCsvSyncUrl(input.csvUrl, input.sourceChannel, normalizeColumnMapping(input.columnMapping))
}

export async function runCsvSyncNow(id: string) {
  const context = await requireTenantContext({ permission: 'manageImports' })
  const result = await runCsvSyncConnectionForStore(id, context.storeId)
  recordTenantEvent({
    event: 'csv_sync_manual_run_completed',
    tenant: context,
    properties: {
      connectionId: id,
      status: result.status,
      importedRows: result.importedRows,
      totalRows: result.totalRows,
    },
  })
  return result
}

async function getCurrentStoreId() {
  const context = await getTenantContext()
  return context?.storeId ?? null
}

async function assertConnectionOwnership(id: string, storeId: string) {
  const connection = await prisma.csvSyncConnection.findFirst({
    where: { id, storeId },
    select: { id: true },
  })
  if (!connection) {
    throw new Error('CSV sync connection not found')
  }
}

function connectionToState(connection: {
  id: string
  name: string
  csvUrl: string
  sourceChannel: SourceChannel
  columnMapping: unknown
  enabled: boolean
  intervalMinutes: number
  lastSyncStatus: 'success' | 'failed' | 'skipped' | null
  lastSyncError: string | null
  lastSyncedAt: Date | null
  createdAt: Date
}): CsvSyncConnectionState {
  return {
    id: connection.id,
    name: connection.name,
    csvUrl: connection.csvUrl,
    sourceChannel: connection.sourceChannel,
    columnMapping: normalizeColumnMapping(connection.columnMapping as Partial<ColumnMapping>),
    enabled: connection.enabled,
    intervalMinutes: connection.intervalMinutes,
    lastSyncStatus: connection.lastSyncStatus ?? undefined,
    lastSyncError: connection.lastSyncError ?? undefined,
    lastSyncedAt: connection.lastSyncedAt?.toISOString(),
    createdAt: connection.createdAt.toISOString(),
  }
}

function runToResult(run: {
  connectionId: string
  status: 'success' | 'failed' | 'skipped'
  totalRows: number
  importedRows: number
  errorMessage: string | null
  startedAt: Date
  finishedAt: Date | null
}): CsvSyncRunResult {
  return {
    connectionId: run.connectionId,
    status: run.status,
    totalRows: run.totalRows,
    importedRows: run.importedRows,
    errorMessage: run.errorMessage ?? undefined,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString(),
  }
}

function finiteOrDefault(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback
}

function emptyFinanceWorkspace() {
  return {
    settings: defaultFinanceSettings,
    connections: [] as CsvSyncConnectionState[],
    runs: [] as CsvSyncRunResult[],
  }
}
