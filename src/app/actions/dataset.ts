'use server'

import { normalizeDatabaseError } from '@/lib/database-errors'
import { captureOperationalError, recordTenantEvent } from '@/lib/observability'
import { clearDatasetForStore, loadDatasetForStore } from '@/lib/server/dataset-store'
import { importOrdersForTenant, type ImportOrdersCommand } from '@/lib/services/dataset-import'
import { requireTenantContext, writeAuditLog } from '@/lib/tenancy'
import type { IntelligenceDataset } from '@/lib/types'

export async function ensureUserStore(): Promise<string> {
  try {
    const context = await requireTenantContext({ permission: 'readAnalytics' })
    return context.storeId
  } catch (error) {
    throw normalizeDatabaseError(error)
  }
}

export async function loadCurrentDataset(): Promise<Omit<IntelligenceDataset, 'vipThreshold'>> {
  try {
    const context = await requireTenantContext({ permission: 'readAnalytics' })
    return loadDatasetForStore(context.storeId)
  } catch (error) {
    throw normalizeDatabaseError(error)
  }
}

export async function importCurrentOrders(command: ImportOrdersCommand): Promise<Omit<IntelligenceDataset, 'vipThreshold'>> {
  let context: Awaited<ReturnType<typeof requireTenantContext>> | null = null

  try {
    context = await requireTenantContext({ permission: 'manageImports' })
    const dataset = await importOrdersForTenant(context, command)
    await writeAuditLog(context, {
      action: 'dataset.import.persisted',
      resourceType: 'store',
      resourceId: context.storeId,
      metadata: {
        fileName: command.fileName,
        sourceChannel: command.sourceChannel,
        submittedRows: command.orders.length,
        customers: dataset.customers.length,
        orders: dataset.orders.length,
        imports: dataset.imports.length,
      },
    })
    return dataset
  } catch (error) {
    captureOperationalError(error, {
      operation: 'dataset.import',
      tenant: context ?? undefined,
      properties: {
        fileName: command.fileName,
        sourceChannel: command.sourceChannel,
        submittedRows: Array.isArray(command.orders) ? command.orders.length : 0,
      },
    })
    throw normalizeDatabaseError(error)
  }
}

export async function clearCurrentDataset(): Promise<void> {
  try {
    const context = await requireTenantContext({ permission: 'manageImports' })
    await clearDatasetForStore(context.storeId)
    await writeAuditLog(context, {
      action: 'dataset.cleared',
      resourceType: 'store',
      resourceId: context.storeId,
    })
    recordTenantEvent({
      event: 'dataset_cleared',
      tenant: context,
      properties: { storeId: context.storeId },
    })
  } catch (error) {
    captureOperationalError(error, { operation: 'dataset.clear' })
    throw normalizeDatabaseError(error)
  }
}
