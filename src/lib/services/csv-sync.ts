import { defaultMapping, parseCsv, processOrders, rowsToOrders, type ColumnMapping } from '@/lib/services/import-pipeline'
import type { CsvSyncConnectionState, CsvSyncRunResult, IntelligenceDataset, SourceChannel } from '@/lib/types'

export type CsvSyncInput = {
  id: string
  name: string
  csvUrl: string
  sourceChannel: SourceChannel
  columnMapping?: Partial<ColumnMapping>
  enabled: boolean
}

export type CsvSyncProcessResult = {
  dataset: IntelligenceDataset
  run: CsvSyncRunResult
}

export async function testCsvSyncUrl(
  csvUrl: string,
  sourceChannel: SourceChannel,
  columnMapping: Partial<ColumnMapping> = {},
  fetchText = fetchCsvText,
) {
  validateCsvSyncUrl(csvUrl)
  const text = await fetchText(csvUrl)
  const parsed = parseCsv(text)
  const mapping = normalizeColumnMapping(columnMapping)
  const orders = rowsToOrders(parsed.rows, sourceChannel, mapping)

  return {
    totalRows: parsed.rows.length,
    importableRows: orders.length,
    errors: parsed.errors,
    canImport: orders.length > 0 && parsed.errors.length === 0,
  }
}

export async function runCsvSyncFromUrl(
  connection: CsvSyncInput,
  dataset: IntelligenceDataset,
  fetchText = fetchCsvText,
) {
  if (!connection.enabled) {
    return skippedRun(connection, dataset, 'Connection disabled')
  }

  const startedAt = new Date().toISOString()
  try {
    validateCsvSyncUrl(connection.csvUrl)
    const text = await fetchText(connection.csvUrl)
    return runCsvSyncFromText(connection, dataset, text)
  } catch (error) {
    return {
      dataset,
      run: {
        connectionId: connection.id,
        status: 'failed' as const,
        totalRows: 0,
        importedRows: 0,
        errorMessage: error instanceof Error ? error.message : 'CSV sync failed',
        startedAt,
        finishedAt: new Date().toISOString(),
      },
    }
  }
}

export function runCsvSyncFromText(
  connection: CsvSyncInput,
  dataset: IntelligenceDataset,
  csvText: string,
): CsvSyncProcessResult {
  const startedAt = new Date().toISOString()
  if (!connection.enabled) {
    return skippedRun(connection, dataset, 'Connection disabled', startedAt)
  }

  try {
    const parsed = parseCsv(csvText)
    const mapping = normalizeColumnMapping(connection.columnMapping)
    const orders = rowsToOrders(parsed.rows, connection.sourceChannel, mapping)
    const existingKeys = new Set(dataset.orders.map((order) => orderKey(order.sourceChannel, order.externalOrderId)))
    const newOrders = orders.filter((order) => !existingKeys.has(orderKey(order.sourceChannel, order.externalOrderId)))
    const nextDataset = appendSyncImport(dataset, newOrders, connection.name, connection.sourceChannel, orders.length)

    return {
      dataset: nextDataset,
      run: {
        connectionId: connection.id,
        status: 'success',
        totalRows: orders.length,
        importedRows: newOrders.length,
        startedAt,
        finishedAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    return {
      dataset,
      run: {
        connectionId: connection.id,
        status: 'failed',
        totalRows: 0,
        importedRows: 0,
        errorMessage: error instanceof Error ? error.message : 'CSV sync failed',
        startedAt,
        finishedAt: new Date().toISOString(),
      },
    }
  }
}

export function normalizeColumnMapping(mapping: Partial<ColumnMapping> = {}): ColumnMapping {
  return {
    ...defaultMapping,
    ...Object.fromEntries(
      Object.entries(mapping).filter(([, value]) => typeof value === 'string'),
    ),
  }
}

export function validateCsvSyncUrl(csvUrl: string) {
  const url = new URL(csvUrl)
  if (url.protocol !== 'https:') {
    throw new Error('CSV sync URL must use HTTPS.')
  }
}

export function connectionToSyncInput(connection: CsvSyncConnectionState): CsvSyncInput {
  return {
    id: connection.id,
    name: connection.name,
    csvUrl: connection.csvUrl,
    sourceChannel: connection.sourceChannel,
    columnMapping: connection.columnMapping,
    enabled: connection.enabled,
  }
}

async function fetchCsvText(csvUrl: string) {
  const response = await fetch(csvUrl, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`CSV URL returned ${response.status}`)
  }

  return response.text()
}

function appendSyncImport(
  dataset: IntelligenceDataset,
  newOrders: ReturnType<typeof rowsToOrders>,
  connectionName: string,
  sourceChannel: SourceChannel,
  totalRows: number,
) {
  const imported = processWithoutImportRecord(dataset, newOrders)

  return {
    ...imported,
    imports: [
      {
        id: crypto.randomUUID(),
        fileName: `${connectionName} auto-sync`,
        sourceChannel,
        importStatus: 'completed' as const,
        totalRows,
        importedRows: newOrders.length,
        createdAt: new Date().toISOString(),
      },
      ...imported.imports,
    ],
  }
}

function processWithoutImportRecord(dataset: IntelligenceDataset, orders: ReturnType<typeof rowsToOrders>) {
  if (orders.length === 0) return dataset

  const next = processOrders(dataset, orders, 'sync.csv', orders[0].sourceChannel)

  return {
    ...next,
    imports: dataset.imports,
  }
}

function skippedRun(
  connection: CsvSyncInput,
  dataset: IntelligenceDataset,
  errorMessage: string,
  startedAt = new Date().toISOString(),
): CsvSyncProcessResult {
  return {
    dataset,
    run: {
      connectionId: connection.id,
      status: 'skipped',
      totalRows: 0,
      importedRows: 0,
      errorMessage,
      startedAt,
      finishedAt: new Date().toISOString(),
    },
  }
}

function orderKey(sourceChannel: SourceChannel, externalOrderId: string) {
  return `${sourceChannel}:${externalOrderId}`
}
