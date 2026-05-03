'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { ensureUserStore, loadDataset, persistImport } from '@/app/actions/dataset'
import { defaultVipThreshold } from '@/lib/empty-dataset'
import { defaultFinanceSettings } from '@/lib/services/finance'
import { connectionToSyncInput, normalizeColumnMapping, runCsvSyncFromUrl, testCsvSyncUrl } from '@/lib/services/csv-sync'
import type { ColumnMapping } from '@/lib/services/import-pipeline'
import type { CsvSyncConnectionState, CsvSyncRunResult, FinanceSettings, SourceChannel } from '@/lib/types'

export async function loadFinanceWorkspace() {
  const storeId = await getCurrentStoreId()
  if (!storeId) {
    return {
      settings: defaultFinanceSettings,
      connections: [] as CsvSyncConnectionState[],
      runs: [] as CsvSyncRunResult[],
    }
  }

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
}

export async function saveFinanceSettings(settings: FinanceSettings) {
  const storeId = await requireCurrentStoreId()

  await prisma.store.update({
    where: { id: storeId },
    data: {
      taxCountry: settings.taxCountry || defaultFinanceSettings.taxCountry,
      taxLabel: settings.taxLabel || defaultFinanceSettings.taxLabel,
      taxRate: finiteOrDefault(settings.taxRate, defaultFinanceSettings.taxRate),
      taxIncluded: Boolean(settings.taxIncluded),
    },
  })
}

export async function createCsvSyncConnection(input: {
  name: string
  csvUrl: string
  sourceChannel: SourceChannel
  columnMapping?: Partial<ColumnMapping>
  intervalMinutes?: number
}) {
  const storeId = await requireCurrentStoreId()
  const mapping = normalizeColumnMapping(input.columnMapping)
  await testCsvSyncUrl(input.csvUrl, input.sourceChannel, mapping)

  const connection = await prisma.csvSyncConnection.create({
    data: {
      storeId,
      name: input.name.trim() || 'CSV sync',
      csvUrl: input.csvUrl.trim(),
      sourceChannel: input.sourceChannel,
      columnMapping: mapping,
      intervalMinutes: input.intervalMinutes ?? 60,
      enabled: true,
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
  const storeId = await requireCurrentStoreId()
  await assertConnectionOwnership(input.id, storeId)
  const connection = await prisma.csvSyncConnection.update({
    where: { id: input.id },
    data: {
      enabled: input.enabled,
      name: input.name,
      intervalMinutes: input.intervalMinutes,
    },
  })

  return connectionToState(connection)
}

export async function deleteCsvSyncConnection(id: string) {
  const storeId = await requireCurrentStoreId()
  await assertConnectionOwnership(id, storeId)
  await prisma.csvSyncConnection.delete({ where: { id } })
}

export async function testCsvSyncConnectionUrl(input: {
  csvUrl: string
  sourceChannel: SourceChannel
  columnMapping?: Partial<ColumnMapping>
}) {
  return testCsvSyncUrl(input.csvUrl, input.sourceChannel, normalizeColumnMapping(input.columnMapping))
}

export async function runCsvSyncNow(id: string) {
  const storeId = await requireCurrentStoreId()
  return runCsvSyncConnectionById(id, storeId)
}

export async function runDueCsvSyncConnections() {
  const connections = await prisma.csvSyncConnection.findMany({
    where: { enabled: true },
    orderBy: { createdAt: 'asc' },
  })
  const results: CsvSyncRunResult[] = []
  const now = Date.now()

  for (const connection of connections) {
    const dueAt = connection.lastSyncedAt
      ? connection.lastSyncedAt.getTime() + connection.intervalMinutes * 60_000
      : 0
    if (dueAt > now) continue

    results.push(await runCsvSyncConnectionById(connection.id, connection.storeId))
  }

  return results
}

async function runCsvSyncConnectionById(id: string, storeId: string) {
  const connection = await prisma.csvSyncConnection.findFirst({
    where: { id, storeId },
  })

  if (!connection) {
    throw new Error('CSV sync connection not found')
  }

  const dbDataset = await loadDataset(storeId)
  const result = await runCsvSyncFromUrl(connectionToSyncInput(connectionToState(connection)), {
    ...dbDataset,
    vipThreshold: defaultVipThreshold,
  })

  if (result.run.status === 'success') {
    await persistImport(storeId, result.dataset)
  }

  await prisma.csvSyncRun.create({
    data: {
      storeId,
      connectionId: connection.id,
      status: result.run.status,
      totalRows: result.run.totalRows,
      importedRows: result.run.importedRows,
      errorMessage: result.run.errorMessage ?? null,
      startedAt: new Date(result.run.startedAt),
      finishedAt: result.run.finishedAt ? new Date(result.run.finishedAt) : null,
    },
  })

  await prisma.csvSyncConnection.update({
    where: { id: connection.id },
    data: {
      lastSyncStatus: result.run.status,
      lastSyncError: result.run.errorMessage ?? null,
      lastSyncedAt: new Date(),
    },
  })

  return result.run
}

async function getCurrentStoreId() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) return null

  return ensureUserStore(data.user.id, data.user.email ?? '')
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

async function requireCurrentStoreId() {
  const storeId = await getCurrentStoreId()
  if (!storeId) {
    throw new Error('Not authenticated')
  }

  return storeId
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
