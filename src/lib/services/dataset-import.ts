import { defaultVipThreshold } from '@/lib/empty-dataset'
import { reserveImportOrderUsage } from '@/lib/billing/enforcement'
import { captureOperationalError, recordTenantEvent } from '@/lib/observability'
import { loadDatasetForStore, persistImportForStore } from '@/lib/server/dataset-store'
import { processOrders } from '@/lib/services/import-pipeline'
import { queueLifecycleAutomationForDataset } from '@/lib/services/lifecycle-automation'
import type { TenantContext } from '@/lib/tenancy'
import type { IntelligenceDataset, OrderInput, SourceChannel } from '@/lib/types'

const maxServerActionImportRows = 5000
const maxOrderItemsPerOrder = 100
const sourceChannels = new Set<SourceChannel>(['shopee', 'tiktok', 'instagram', 'facebook', 'website', 'csv'])

export type ImportOrdersCommand = {
  orders: OrderInput[]
  fileName: string
  sourceChannel: SourceChannel
  vipThreshold?: number
}

export async function importOrdersForTenant(
  context: TenantContext,
  command: ImportOrdersCommand,
): Promise<Omit<IntelligenceDataset, 'vipThreshold'>> {
  const normalized = normalizeImportCommand(command)
  const current = await loadDatasetForStore(context.storeId)
  const currentDataset = {
    ...current,
    vipThreshold: normalized.vipThreshold,
  }
  const nextDataset = processOrders(
    currentDataset,
    normalized.orders,
    normalized.fileName,
    normalized.sourceChannel,
  )
  const usageReservation = await reserveImportOrderUsage(context, normalized.orders.length)

  try {
    await persistImportForStore(context.storeId, nextDataset)
  } catch (error) {
    await usageReservation.release()
    throw error
  }

  recordTenantEvent({
    event: 'dataset_import_persisted',
    tenant: context,
    properties: {
      storeId: context.storeId,
      sourceChannel: normalized.sourceChannel,
      submittedRows: command.orders.length,
      acceptedRows: normalized.orders.length,
      customers: nextDataset.customers.length,
      orders: nextDataset.orders.length,
    },
  })

  try {
    await queueLifecycleAutomationForDataset(context, nextDataset, { source: 'dataset_import' })
  } catch (error) {
    captureOperationalError(error, {
      operation: 'automation.lifecycle.queue',
      tenant: context,
      properties: {
        storeId: context.storeId,
        sourceChannel: normalized.sourceChannel,
        submittedRows: command.orders.length,
        acceptedRows: normalized.orders.length,
      },
    })
    recordTenantEvent({
      event: 'lifecycle_automation_queue_failed',
      tenant: context,
      properties: {
        storeId: context.storeId,
        sourceChannel: normalized.sourceChannel,
      },
    })
  }

  return stripVipThreshold(nextDataset)
}

function normalizeImportCommand(command: ImportOrdersCommand): Required<ImportOrdersCommand> {
  if (!sourceChannels.has(command.sourceChannel)) {
    throw new Error('Unsupported source channel.')
  }

  if (!Array.isArray(command.orders) || command.orders.length === 0) {
    throw new Error('Import requires at least one order.')
  }

  if (command.orders.length > maxServerActionImportRows) {
    throw new Error(`Import is limited to ${maxServerActionImportRows.toLocaleString()} rows per request.`)
  }

  const orders = command.orders
    .map((order, index) => normalizeOrderInput(order, command.sourceChannel, index))
    .filter((order): order is OrderInput => Boolean(order))

  if (orders.length === 0) {
    throw new Error('Import has no valid orders.')
  }

  return {
    orders,
    fileName: normalizeFileName(command.fileName),
    sourceChannel: command.sourceChannel,
    vipThreshold: normalizeVipThreshold(command.vipThreshold),
  }
}

function normalizeOrderInput(
  order: OrderInput,
  sourceChannel: SourceChannel,
  index: number,
): OrderInput | null {
  const orderDate = normalizeOrderDate(order.orderDate)
  const totalAmount = finitePositiveNumber(order.totalAmount)

  if (!orderDate || !totalAmount) return null

  const items = Array.isArray(order.items)
    ? order.items.slice(0, maxOrderItemsPerOrder).map((item) => ({
      productName: cleanText(item.productName, 'Imported product', 240),
      quantity: finitePositiveNumber(item.quantity) ?? 1,
      unitPrice: finiteNumber(item.unitPrice) ?? totalAmount,
    }))
    : []

  return {
    externalOrderId: cleanText(order.externalOrderId, `${sourceChannel}-${index + 1}`, 256),
    sourceChannel,
    customerNameRaw: cleanText(order.customerNameRaw, 'Unknown customer', 240),
    emailRaw: cleanOptionalText(order.emailRaw, 320),
    phoneRaw: cleanOptionalText(order.phoneRaw, 80),
    lineIdRaw: cleanOptionalText(order.lineIdRaw, 120),
    provinceRaw: cleanOptionalText(order.provinceRaw, 120),
    orderDate,
    totalAmount,
    taxAmount: finiteNumber(order.taxAmount),
    discountAmount: finiteNumber(order.discountAmount),
    shippingAmount: finiteNumber(order.shippingAmount),
    platformFeeAmount: finiteNumber(order.platformFeeAmount),
    refundAmount: finiteNumber(order.refundAmount),
    taxRate: finiteNumber(order.taxRate),
    taxIncluded: typeof order.taxIncluded === 'boolean' ? order.taxIncluded : undefined,
    items: items.length > 0 ? items : [{
      productName: 'Imported product',
      quantity: 1,
      unitPrice: totalAmount,
    }],
  }
}

function stripVipThreshold(dataset: IntelligenceDataset): Omit<IntelligenceDataset, 'vipThreshold'> {
  return {
    customers: dataset.customers,
    orders: dataset.orders,
    imports: dataset.imports,
  }
}

function normalizeOrderDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function normalizeVipThreshold(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 100_000_000
    ? value
    : defaultVipThreshold
}

function normalizeFileName(value: string) {
  return cleanText(value, 'orders.csv', 180)
}

function cleanText(value: string | undefined, fallback: string, maxLength: number) {
  const clean = value?.trim()
  return (clean || fallback).slice(0, maxLength)
}

function cleanOptionalText(value: string | undefined, maxLength: number) {
  const clean = value?.trim()
  return clean ? clean.slice(0, maxLength) : undefined
}

function finitePositiveNumber(value: number | undefined) {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : null
}

function finiteNumber(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : undefined
}
