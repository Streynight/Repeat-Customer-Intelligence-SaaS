import Papa from 'papaparse'
import { createCustomerFromOrder, mergeOrderIntoCustomer, resolveCustomerIdentity } from '@/lib/services/identity'
import type { ImportRecord, IntelligenceDataset, OrderInput, SourceChannel } from '@/lib/types'

export type ColumnMapping = {
  externalOrderId: string
  customerNameRaw: string
  emailRaw: string
  phoneRaw: string
  lineIdRaw: string
  provinceRaw: string
  orderDate: string
  totalAmount: string
  productName: string
  quantity: string
  unitPrice: string
}

export const defaultMapping: ColumnMapping = {
  externalOrderId: 'order_id',
  customerNameRaw: 'customer_name',
  emailRaw: 'email',
  phoneRaw: 'phone',
  lineIdRaw: 'line_id',
  provinceRaw: 'province',
  orderDate: 'order_date',
  totalAmount: 'total_amount',
  productName: 'product_name',
  quantity: 'quantity',
  unitPrice: 'unit_price',
}

export type ImportDiagnosticIssue = {
  rowNumber: number
  severity: 'error' | 'warning'
  message: string
}

export type LikelyMerge = {
  rowNumber: number
  customerName: string
  matchedCustomer: string
  strategy: string
  confidence: number
}

export type ImportDiagnostics = {
  totalRows: number
  validRows: number
  invalidRows: number
  missingRequiredMappings: string[]
  badDates: number
  badAmounts: number
  missingContactRows: number
  duplicateOrderIds: number
  likelyMergeCounts: {
    phone: number
    email: number
    lineId: number
    fuzzyName: number
  }
  likelyMerges: LikelyMerge[]
  issues: ImportDiagnosticIssue[]
  canImport: boolean
}

const requiredMappingKeys: Array<keyof ColumnMapping> = [
  'externalOrderId',
  'customerNameRaw',
  'orderDate',
  'totalAmount',
]

export function parseCsv(text: string) {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  })

  return {
    rows: parsed.data,
    fields: parsed.meta.fields ?? [],
    errors: parsed.errors.map((error) => error.message),
  }
}

export function rowsToOrders(
  rows: Array<Record<string, string>>,
  sourceChannel: SourceChannel,
  mapping: ColumnMapping,
): OrderInput[] {
  return rows
    .map((row, index) => {
      const totalAmount = Number(cleanMoney(row[mapping.totalAmount]))
      const quantity = Number(row[mapping.quantity] || 1)
      const unitPrice = Number(cleanMoney(row[mapping.unitPrice])) || totalAmount

      return {
        externalOrderId: row[mapping.externalOrderId] || `${sourceChannel}-${index + 1}`,
        sourceChannel,
        customerNameRaw: row[mapping.customerNameRaw] || 'Unknown customer',
        emailRaw: emptyToUndefined(row[mapping.emailRaw]),
        phoneRaw: emptyToUndefined(row[mapping.phoneRaw]),
        lineIdRaw: emptyToUndefined(row[mapping.lineIdRaw]),
        provinceRaw: emptyToUndefined(row[mapping.provinceRaw]),
        orderDate: normalizeDate(row[mapping.orderDate]),
        totalAmount: Number.isFinite(totalAmount) ? totalAmount : 0,
        items: [
          {
            productName: row[mapping.productName] || 'Imported product',
            quantity: Number.isFinite(quantity) ? quantity : 1,
            unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
          },
        ],
      }
    })
    .filter((order) => order.orderDate && order.totalAmount > 0)
}

export function analyzeImportRows(
  rows: Array<Record<string, string>>,
  sourceChannel: SourceChannel,
  mapping: ColumnMapping,
  dataset: IntelligenceDataset,
): ImportDiagnostics {
  const missingRequiredMappings = requiredMappingKeys.filter((key) => !mapping[key])
  const issues: ImportDiagnosticIssue[] = []
  const likelyMerges: LikelyMerge[] = []
  const seenOrderIds = new Set<string>()
  const duplicateOrderIds = new Set<string>()
  const validOrders: OrderInput[] = []
  let badDates = 0
  let badAmounts = 0
  let missingContactRows = 0

  if (missingRequiredMappings.length > 0) {
    missingRequiredMappings.forEach((key) => {
      issues.push({
        rowNumber: 0,
        severity: 'error',
        message: `Required mapping is missing: ${key}`,
      })
    })
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 2
    const orderId = readMapped(row, mapping.externalOrderId)
    const customerName = readMapped(row, mapping.customerNameRaw)
    const orderDateRaw = readMapped(row, mapping.orderDate)
    const amountRaw = readMapped(row, mapping.totalAmount)
    const emailRaw = readMapped(row, mapping.emailRaw)
    const phoneRaw = readMapped(row, mapping.phoneRaw)
    const lineIdRaw = readMapped(row, mapping.lineIdRaw)
    const totalAmount = Number(cleanMoney(amountRaw))
    const parsedDate = orderDateRaw ? new Date(orderDateRaw) : null
    let rowHasError = false

    if (orderId) {
      const dedupeKey = `${sourceChannel}:${orderId}`
      if (seenOrderIds.has(dedupeKey)) {
        duplicateOrderIds.add(dedupeKey)
        issues.push({
          rowNumber,
          severity: 'warning',
          message: `Duplicate order ID in this file: ${orderId}`,
        })
      }
      seenOrderIds.add(dedupeKey)
    }

    if (!customerName) {
      rowHasError = true
      issues.push({
        rowNumber,
        severity: 'error',
        message: 'Missing customer name',
      })
    }

    if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
      rowHasError = true
      badDates += 1
      issues.push({
        rowNumber,
        severity: 'error',
        message: `Bad order date: ${orderDateRaw || '(empty)'}`,
      })
    }

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      rowHasError = true
      badAmounts += 1
      issues.push({
        rowNumber,
        severity: 'error',
        message: `Bad or zero amount: ${amountRaw || '(empty)'}`,
      })
    }

    if (!phoneRaw && !emailRaw) {
      missingContactRows += 1
      issues.push({
        rowNumber,
        severity: 'warning',
        message: 'Missing phone and email; fuzzy name matching may be used',
      })
    }

    if (!rowHasError && missingRequiredMappings.length === 0) {
      const order = rowsToOrders([row], sourceChannel, mapping)[0]
      if (order) {
        validOrders.push(order)
        const match = resolveCustomerIdentity(dataset.customers, order)
        if (match) {
          likelyMerges.push({
            rowNumber,
            customerName: order.customerNameRaw,
            matchedCustomer: match.customer.fullName,
            strategy: match.strategy,
            confidence: match.confidence,
          })
        }
      }
    }

    if (lineIdRaw && !phoneRaw && !emailRaw) {
      issues.push({
        rowNumber,
        severity: 'warning',
        message: 'LINE ID is present, but phone/email would make matching stronger',
      })
    }
  })

  const likelyMergeCounts = likelyMerges.reduce(
    (counts, merge) => {
      if (merge.strategy.includes('phone')) counts.phone += 1
      else if (merge.strategy.includes('email')) counts.email += 1
      else if (merge.strategy.includes('line_id')) counts.lineId += 1
      else counts.fuzzyName += 1
      return counts
    },
    { phone: 0, email: 0, lineId: 0, fuzzyName: 0 },
  )

  return {
    totalRows: rows.length,
    validRows: validOrders.length,
    invalidRows: rows.length - validOrders.length,
    missingRequiredMappings: missingRequiredMappings.map(String),
    badDates,
    badAmounts,
    missingContactRows,
    duplicateOrderIds: duplicateOrderIds.size,
    likelyMergeCounts,
    likelyMerges,
    issues,
    canImport: missingRequiredMappings.length === 0 && validOrders.length > 0,
  }
}

export function processOrders(
  dataset: IntelligenceDataset,
  orders: OrderInput[],
  fileName: string,
  sourceChannel: SourceChannel,
): IntelligenceDataset {
  let customers = [...dataset.customers]
  const orderRecords = [...dataset.orders]

  for (const order of orders) {
    const existingOrder = orderRecords.some(
      (item) => item.externalOrderId === order.externalOrderId && item.sourceChannel === order.sourceChannel,
    )

    if (existingOrder) continue

    const match = resolveCustomerIdentity(customers, order)
    const updatedCustomer = match
      ? mergeOrderIntoCustomer(match.customer, order, dataset.vipThreshold)
      : createCustomerFromOrder(order, dataset.vipThreshold)

    customers = match
      ? customers.map((customer) => (customer.id === updatedCustomer.id ? updatedCustomer : customer))
      : [...customers, updatedCustomer]
  }

  const nextOrders = customers.flatMap((customer) => customer.orders)
  const importRecord: ImportRecord = {
    id: crypto.randomUUID(),
    fileName,
    sourceChannel,
    importStatus: 'completed',
    totalRows: orders.length,
    importedRows: orders.length,
    createdAt: new Date().toISOString(),
  }

  return {
    ...dataset,
    customers,
    orders: nextOrders,
    imports: [importRecord, ...dataset.imports],
  }
}

function cleanMoney(value?: string) {
  return (value ?? '').replace(/[$,฿]/g, '').trim()
}

function readMapped(row: Record<string, string>, key?: string) {
  return key ? row[key]?.trim() ?? '' : ''
}

function emptyToUndefined(value?: string) {
  const clean = value?.trim()
  return clean ? clean : undefined
}

function normalizeDate(value?: string) {
  const date = value ? new Date(value) : new Date()
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}
