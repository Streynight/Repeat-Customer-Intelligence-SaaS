'use server'

import { normalizeDatabaseError } from '@/lib/database-errors'
import { clearDatasetForStore, loadDatasetForStore, persistImportForStore } from '@/lib/server/dataset-store'
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

export async function persistCurrentImport(dataset: IntelligenceDataset): Promise<void> {
  try {
    const context = await requireTenantContext({ permission: 'manageImports' })
    await persistImportForStore(context.storeId, dataset)
    await writeAuditLog(context, {
      action: 'dataset.import.persisted',
      resourceType: 'store',
      resourceId: context.storeId,
      metadata: {
        customers: dataset.customers.length,
        orders: dataset.orders.length,
        imports: dataset.imports.length,
      },
    })
  } catch (error) {
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
  } catch (error) {
    throw normalizeDatabaseError(error)
  }
}
