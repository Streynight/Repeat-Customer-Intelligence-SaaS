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
  sku: string
  quantity: string
  unitPrice: string
  taxAmount: string
  discountAmount: string
  shippingAmount: string
  platformFeeAmount: string
  refundAmount: string
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
  sku: 'sku',
  quantity: 'quantity',
  unitPrice: 'unit_price',
  taxAmount: 'tax_amount',
  discountAmount: 'discount_amount',
  shippingAmount: 'shipping_amount',
  platformFeeAmount: 'platform_fee_amount',
  refundAmount: 'refund_amount',
}

export type SheetCellValue = string | number | boolean | Date | null

export type ParsedImportRows = {
  fields: string[]
  rows: Array<Record<string, string>>
  errors: string[]
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

const columnAliases: Record<keyof ColumnMapping, string[]> = {
  externalOrderId: [
    'order_id',
    'order id',
    'order number',
    'order no',
    'order sn',
    'เลขคำสั่งซื้อ',
    'หมายเลขคำสั่งซื้อ',
    'หมายเลขออเดอร์',
    'รหัสคำสั่งซื้อ',
  ],
  customerNameRaw: [
    'customer_name',
    'customer name',
    'buyer name',
    'buyer username',
    'recipient name',
    'receiver name',
    'ship to name',
    'ชื่อผู้ซื้อ',
    'ชื่อผู้รับ',
    'ชื่อลูกค้า',
  ],
  emailRaw: [
    'email',
    'customer email',
    'buyer email',
    'อีเมล',
  ],
  phoneRaw: [
    'phone',
    'customer_phone',
    'customer phone',
    'phone number',
    'buyer phone',
    'recipient phone',
    'receiver phone',
    'เบอร์โทร',
    'เบอร์โทรศัพท์',
    'หมายเลขโทรศัพท์',
    'โทรศัพท์ผู้รับ',
  ],
  lineIdRaw: [
    'line_id',
    'line id',
    'line',
    'line account',
    'ไลน์',
    'ไลน์ไอดี',
  ],
  provinceRaw: [
    'province',
    'state',
    'recipient province',
    'shipping province',
    'จังหวัด',
    'จังหวัดผู้รับ',
  ],
  orderDate: [
    'order_date',
    'order date',
    'created time',
    'create time',
    'paid time',
    'payment time',
    'order creation date',
    'วันที่สั่งซื้อ',
    'วันที่สร้างคำสั่งซื้อ',
    'เวลาสร้างคำสั่งซื้อ',
    'วันที่ชำระเงิน',
  ],
  totalAmount: [
    'total_amount',
    'total amount',
    'total',
    'order total',
    'grand total',
    'total paid',
    'paid amount',
    'final amount',
    'net sales',
    'ยอดรวม',
    'ยอดคำสั่งซื้อ',
    'ยอดชำระ',
    'ยอดสุทธิ',
    'ราคาสุทธิ',
  ],
  productName: [
    'product_name',
    'product name',
    'item name',
    'sku name',
    'product',
    'item',
    'ชื่อสินค้า',
    'ชื่อ sku',
    'ชื่อรายการสินค้า',
  ],
  sku: [
    'sku',
    'seller sku',
    'sku id',
    'variation sku',
    'merchant sku',
    'platform sku',
    'รหัส sku',
    'รหัสสินค้า',
    'เลข sku',
  ],
  quantity: [
    'quantity',
    'qty',
    'item quantity',
    'จำนวน',
    'จำนวนสินค้า',
  ],
  unitPrice: [
    'unit_price',
    'unit price',
    'price',
    'item price',
    'sku unit original price',
    'original price',
    'ราคาต่อหน่วย',
    'ราคาสินค้า',
  ],
  taxAmount: [
    'tax_amount',
    'tax amount',
    'vat',
    'vat amount',
    'ภาษี',
    'ภาษีมูลค่าเพิ่ม',
  ],
  discountAmount: [
    'discount_amount',
    'discount amount',
    'seller discount',
    'voucher',
    'voucher amount',
    'ส่วนลด',
    'ส่วนลดร้านค้า',
  ],
  shippingAmount: [
    'shipping_amount',
    'shipping amount',
    'shipping fee',
    'delivery fee',
    'ค่าส่ง',
    'ค่าจัดส่ง',
  ],
  platformFeeAmount: [
    'platform_fee_amount',
    'platform fee',
    'commission fee',
    'transaction fee',
    'service fee',
    'ค่าธรรมเนียม',
    'ค่าธรรมเนียมแพลตฟอร์ม',
  ],
  refundAmount: [
    'refund_amount',
    'refund amount',
    'refund',
    'returned amount',
    'ยอดคืนเงิน',
    'คืนเงิน',
  ],
}

const platformColumnAliases: Partial<Record<SourceChannel, Partial<Record<keyof ColumnMapping, string[]>>>> = {
  shopee: {
    externalOrderId: ['order sn'],
    customerNameRaw: ['buyer username', 'recipient name'],
    phoneRaw: ['recipient phone', 'phone number'],
    orderDate: ['order creation date', 'paid time'],
    totalAmount: ['order total', 'total paid'],
    productName: ['item name', 'product name'],
    sku: ['variation sku', 'seller sku'],
    unitPrice: ['sku unit original price'],
    shippingAmount: ['shipping fee paid by buyer', 'shipping fee'],
    discountAmount: ['seller voucher', 'seller discount'],
    platformFeeAmount: ['transaction fee', 'commission fee'],
  },
  tiktok: {
    externalOrderId: ['order id'],
    customerNameRaw: ['buyer username', 'recipient', 'recipient name'],
    phoneRaw: ['phone #', 'phone number'],
    orderDate: ['created time', 'paid time'],
    totalAmount: ['seller receivable amount', 'order amount', 'total amount'],
    productName: ['product name', 'sku name'],
    sku: ['seller sku', 'sku id'],
    unitPrice: ['sku unit price', 'unit price'],
    discountAmount: ['seller discount', 'platform discount', 'shop discount'],
    platformFeeAmount: ['commission fee', 'transaction fee', 'platform fee'],
  },
  lazada: {
    externalOrderId: ['order number', 'order item id'],
    customerNameRaw: ['buyer name', 'customer name'],
    phoneRaw: ['buyer phone', 'phone number'],
    provinceRaw: ['shipping province', 'province'],
    orderDate: ['created at', 'paid at', 'order creation date'],
    totalAmount: ['paid price', 'item price', 'order amount'],
    productName: ['product name', 'item name'],
    sku: ['seller sku', 'shop sku', 'sku'],
    shippingAmount: ['shipping fee', 'shipping amount'],
    platformFeeAmount: ['commission amount', 'payment fee'],
  },
}

export function parseCsv(text: string): ParsedImportRows {
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

export function sheetRowsToRecords(sheetRows: SheetCellValue[][]): ParsedImportRows {
  const headerIndex = findHeaderRowIndex(sheetRows)
  if (headerIndex === -1) {
    return {
      fields: [],
      rows: [],
      errors: ['No header row found in the spreadsheet.'],
    }
  }

  const fields = uniqueHeaders(sheetRows[headerIndex])
  const rows = sheetRows
    .slice(headerIndex + 1)
    .filter((row) => row.some((cell) => cellToString(cell)))
    .map((row) => {
      return fields.reduce<Record<string, string>>((record, field, index) => {
        record[field] = cellToString(row[index])
        return record
      }, {})
    })

  return { fields, rows, errors: [] }
}

export function detectColumnMapping(fields: string[], sourceChannel?: SourceChannel): ColumnMapping {
  return (Object.keys(defaultMapping) as Array<keyof ColumnMapping>).reduce<ColumnMapping>((mapping, key) => {
    const platformAliases = sourceChannel ? platformColumnAliases[sourceChannel]?.[key] ?? [] : []
    const match = findMatchingField(fields, [...platformAliases, ...columnAliases[key]])
    mapping[key] = match ?? ''
    return mapping
  }, { ...defaultMapping })
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
      const taxAmount = optionalMoney(row[mapping.taxAmount])
      const discountAmount = optionalMoney(row[mapping.discountAmount])
      const shippingAmount = optionalMoney(row[mapping.shippingAmount])
      const platformFeeAmount = optionalMoney(row[mapping.platformFeeAmount])
      const refundAmount = optionalMoney(row[mapping.refundAmount])

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
        taxAmount,
        discountAmount,
        shippingAmount,
        platformFeeAmount,
        refundAmount,
        items: [
          {
            productName: row[mapping.productName] || 'Imported product',
            sku: emptyToUndefined(row[mapping.sku]),
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
  const missingRequiredMappings = requiredMappingKeys.filter((key) => !mapping[key] || !fieldExistsInRows(rows, mapping[key]))
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
  return (value ?? '').replace(/[$,฿,]/g, '').trim()
}

function optionalMoney(value?: string) {
  const cleaned = cleanMoney(value)
  if (!cleaned) return undefined
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : undefined
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

function findHeaderRowIndex(rows: SheetCellValue[][]) {
  let bestIndex = -1
  let bestScore = 0

  rows.forEach((row, index) => {
    const nonEmptyCells = row.filter((cell) => cellToString(cell)).length
    if (nonEmptyCells < 2) return

    const score = row.reduce<number>((sum, cell) => sum + headerAliasScore(cellToString(cell)), 0)
    if (score > bestScore) {
      bestScore = score
      bestIndex = index
    }
  })

  if (bestIndex !== -1 && bestScore >= 2) return bestIndex

  return rows.findIndex((row) => row.filter((cell) => cellToString(cell)).length >= 2)
}

function uniqueHeaders(row: SheetCellValue[]) {
  const seen = new Map<string, number>()

  return row.map((cell, index) => {
    const base = cellToString(cell) || `column_${index + 1}`
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base}_${count + 1}`
  })
}

function cellToString(value: SheetCellValue | undefined) {
  if (value === undefined || value === null) return ''
  if (value instanceof Date) return value.toISOString()
  return String(value).trim()
}

function findMatchingField(fields: string[], aliases: string[]) {
  const normalizedAliases = aliases.flatMap((alias) => normalizedColumnKeys(alias))

  return fields.find((field) => {
    const normalizedField = normalizedColumnKeys(field)
    return normalizedAliases.some((alias) => {
      return normalizedField.some((fieldKey) => fieldKey.includes(alias) || alias.includes(fieldKey))
    })
  })
}

function headerAliasScore(value: string) {
  if (!value) return 0
  const keys = normalizedColumnKeys(value)

  return Object.values(columnAliases).some((aliases) => {
    const normalizedAliases = aliases.flatMap((alias) => normalizedColumnKeys(alias))
    return normalizedAliases.some((alias) => {
      return keys.some((key) => key.includes(alias) || alias.includes(key))
    })
  }) ? 1 : 0
}

function normalizedColumnKeys(value: string) {
  const clean = value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
  const compact = clean.replace(/[^\p{L}\p{N}]+/gu, '')

  return clean === compact ? [clean] : [clean, compact]
}

function fieldExistsInRows(rows: Array<Record<string, string>>, field: string) {
  return rows.length === 0 || rows.some((row) => Object.prototype.hasOwnProperty.call(row, field))
}
