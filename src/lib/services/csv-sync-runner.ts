import { prisma } from '@/lib/prisma'
import { reserveImportOrderUsageForStore } from '@/lib/billing/enforcement'
import { defaultVipThreshold } from '@/lib/empty-dataset'
import { captureOperationalError } from '@/lib/observability'
import { acquireLock } from '@/lib/platform/redis'
import { loadDatasetForStore, persistImportForStore } from '@/lib/server/dataset-store'
import {
  normalizeColumnMapping,
  runCsvSyncFromUrl,
} from '@/lib/services/csv-sync'
import type { ColumnMapping } from '@/lib/services/import-pipeline'
import type { CsvSyncRunResult, SourceChannel } from '@/lib/types'

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

    try {
      results.push(await runCsvSyncConnectionForStore(connection.id, connection.storeId))
    } catch (error) {
      captureOperationalError(error, {
        operation: 'csv_sync.due_connection',
        properties: {
          connectionId: connection.id,
          storeId: connection.storeId,
        },
      })
      results.push(failedSyncRun(connection.id, error))
    }
  }

  return results
}

export async function runCsvSyncConnectionForStore(id: string, storeId: string) {
  const connection = await prisma.csvSyncConnection.findFirst({
    where: { id, storeId },
  })

  if (!connection) {
    throw new Error('CSV sync connection not found')
  }

  const lock = await acquireLock(`csv-sync:${connection.id}`, syncLockTtlSeconds(connection.intervalMinutes))
  if (!lock.acquired) {
    const run = skippedSyncRun(connection.id, 'CSV sync is already running for this connection.')
    await recordCsvSyncRun(storeId, connection.id, run, { updateLastSyncedAt: false })
    return run
  }

  try {
    const dbDataset = await loadDatasetForStore(storeId)
    const result = await runCsvSyncFromUrl(connectionToSyncInput(connection), {
      ...dbDataset,
      vipThreshold: defaultVipThreshold,
    })

    if (result.run.status === 'success') {
      const usageReservation = await reserveImportOrderUsageForStore(storeId, result.run.importedRows)
      try {
        await persistImportForStore(storeId, result.dataset)
      } catch (error) {
        await usageReservation.release()
        throw error
      }
    }

    await recordCsvSyncRun(storeId, connection.id, result.run, {
      updateLastSyncedAt: result.run.status !== 'skipped',
    })

    return result.run
  } catch (error) {
    captureOperationalError(error, {
      operation: 'csv_sync.run',
      properties: { connectionId: connection.id, storeId },
    })
    const run = failedSyncRun(connection.id, error)
    await recordCsvSyncRun(storeId, connection.id, run, { updateLastSyncedAt: true })
    return run
  } finally {
    await lock.release()
  }
}

async function recordCsvSyncRun(
  storeId: string,
  connectionId: string,
  run: CsvSyncRunResult,
  options: { updateLastSyncedAt: boolean },
) {
  await prisma.$transaction([
    prisma.csvSyncRun.create({
      data: {
        storeId,
        connectionId,
        status: run.status,
        totalRows: run.totalRows,
        importedRows: run.importedRows,
        errorMessage: run.errorMessage ?? null,
        startedAt: new Date(run.startedAt),
        finishedAt: run.finishedAt ? new Date(run.finishedAt) : null,
      },
    }),
    prisma.csvSyncConnection.update({
      where: { id: connectionId },
      data: {
        lastSyncStatus: run.status,
        lastSyncError: run.errorMessage ?? null,
        ...(options.updateLastSyncedAt ? { lastSyncedAt: new Date() } : {}),
      },
    }),
  ])
}

function failedSyncRun(connectionId: string, error: unknown): CsvSyncRunResult {
  const timestamp = new Date().toISOString()

  return {
    connectionId,
    status: 'failed',
    totalRows: 0,
    importedRows: 0,
    errorMessage: error instanceof Error ? error.message : 'CSV sync failed',
    startedAt: timestamp,
    finishedAt: timestamp,
  }
}

function skippedSyncRun(connectionId: string, errorMessage: string): CsvSyncRunResult {
  const timestamp = new Date().toISOString()

  return {
    connectionId,
    status: 'skipped',
    totalRows: 0,
    importedRows: 0,
    errorMessage,
    startedAt: timestamp,
    finishedAt: timestamp,
  }
}

function syncLockTtlSeconds(intervalMinutes: number) {
  const requested = Math.max(300, intervalMinutes * 60)
  return Math.min(requested, 3600)
}

function connectionToSyncInput(connection: {
  id: string
  name: string
  csvUrl: string
  sourceChannel: SourceChannel
  columnMapping: unknown
  enabled: boolean
}) {
  return {
    id: connection.id,
    name: connection.name,
    csvUrl: connection.csvUrl,
    sourceChannel: connection.sourceChannel,
    columnMapping: normalizeColumnMapping(connection.columnMapping as Partial<ColumnMapping>),
    enabled: connection.enabled,
  }
}
