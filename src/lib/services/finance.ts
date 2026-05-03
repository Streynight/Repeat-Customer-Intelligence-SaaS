import type {
  ChannelIncomeRow,
  FinanceSettings,
  IncomeSummary,
  IntelligenceDataset,
  MonthlyIncomeRow,
  OrderRecord,
  SourceChannel,
  VatSummaryRow,
} from '@/lib/types'

export const defaultFinanceSettings: FinanceSettings = {
  taxCountry: 'TH',
  taxLabel: 'VAT',
  taxRate: 0.07,
  taxIncluded: true,
}

export type IncomeRange = {
  from?: string
  to?: string
}

export function buildIncomeSummary(
  dataset: IntelligenceDataset,
  settings: FinanceSettings = defaultFinanceSettings,
  range: IncomeRange = {},
): IncomeSummary {
  return summarizeOrders(filterOrdersByRange(dataset.orders, range), settings)
}

export function buildMonthlyIncomeRows(
  dataset: IntelligenceDataset,
  settings: FinanceSettings = defaultFinanceSettings,
  range: IncomeRange = {},
): MonthlyIncomeRow[] {
  const groups = groupOrders(filterOrdersByRange(dataset.orders, range), (order) => order.orderDate.slice(0, 7))

  return Array.from(groups.entries())
    .map(([month, orders]) => ({ month, ...summarizeOrders(orders, settings) }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

export function buildVatSummary(
  dataset: IntelligenceDataset,
  settings: FinanceSettings = defaultFinanceSettings,
  range: IncomeRange = {},
): VatSummaryRow[] {
  const groups = groupOrders(filterOrdersByRange(dataset.orders, range), (order) => order.orderDate.slice(0, 7))

  return Array.from(groups.entries())
    .map(([month, orders]) => {
      const summary = summarizeOrders(orders, settings)

      return {
        month,
        grossIncome: summary.grossIncome,
        explicitVat: summary.explicitTaxAmount,
        estimatedVat: summary.estimatedTaxAmount,
        totalVat: summary.taxAmount,
        netBeforeVat: summary.grossIncome - summary.taxAmount,
        orderCount: summary.orderCount,
      }
    })
    .sort((a, b) => a.month.localeCompare(b.month))
}

export function buildChannelIncomeRows(
  dataset: IntelligenceDataset,
  settings: FinanceSettings = defaultFinanceSettings,
  range: IncomeRange = {},
): ChannelIncomeRow[] {
  const groups = groupOrders(filterOrdersByRange(dataset.orders, range), (order) => order.sourceChannel)

  return Array.from(groups.entries())
    .map(([channel, orders]) => ({ channel: channel as SourceChannel, ...summarizeOrders(orders, settings) }))
    .sort((a, b) => b.grossIncome - a.grossIncome || a.channel.localeCompare(b.channel))
}

export function estimateThailandVat(totalAmount: number, rate = 0.07, inclusive = true) {
  if (totalAmount <= 0 || rate <= 0) return 0
  return inclusive ? totalAmount * rate / (1 + rate) : totalAmount * rate
}

export function exportVatSummaryCsv(rows: VatSummaryRow[], label = 'VAT') {
  const header = ['month', 'gross_income', 'explicit_tax', 'estimated_tax', `total_${label.toLowerCase()}`, 'net_before_tax', 'order_count']
  const lines = rows.map((row) => [
    row.month,
    roundMoney(row.grossIncome),
    roundMoney(row.explicitVat),
    roundMoney(row.estimatedVat),
    roundMoney(row.totalVat),
    roundMoney(row.netBeforeVat),
    row.orderCount,
  ].join(','))

  return [header.join(','), ...lines].join('\n')
}

function summarizeOrders(orders: OrderRecord[], settings: FinanceSettings): IncomeSummary {
  const base = orders.reduce(
    (summary, order) => {
      const tax = taxAmountForOrder(order, settings)
      const explicitTax = explicitTaxForOrder(order)
      const estimatedTax = explicitTax > 0 ? 0 : tax

      summary.grossIncome += order.totalAmount
      summary.taxAmount += tax
      summary.explicitTaxAmount += explicitTax
      summary.estimatedTaxAmount += estimatedTax
      summary.discountAmount += order.discountAmount ?? 0
      summary.shippingAmount += order.shippingAmount ?? 0
      summary.platformFeeAmount += order.platformFeeAmount ?? 0
      summary.refundAmount += order.refundAmount ?? 0
      summary.orderCount += 1
      return summary
    },
    {
      grossIncome: 0,
      netIncome: 0,
      taxAmount: 0,
      explicitTaxAmount: 0,
      estimatedTaxAmount: 0,
      discountAmount: 0,
      shippingAmount: 0,
      platformFeeAmount: 0,
      refundAmount: 0,
      orderCount: 0,
      averageOrderValue: 0,
    },
  )

  return {
    ...base,
    netIncome: base.grossIncome - base.taxAmount - base.platformFeeAmount - base.refundAmount,
    averageOrderValue: base.orderCount ? base.grossIncome / base.orderCount : 0,
  }
}

function taxAmountForOrder(order: OrderRecord, settings: FinanceSettings) {
  const explicitTax = explicitTaxForOrder(order)
  if (explicitTax > 0) return explicitTax

  return estimateThailandVat(
    order.totalAmount,
    order.taxRate ?? settings.taxRate,
    order.taxIncluded ?? settings.taxIncluded,
  )
}

function explicitTaxForOrder(order: OrderRecord) {
  return order.taxAmount && order.taxAmount > 0 ? order.taxAmount : 0
}

function filterOrdersByRange(orders: OrderRecord[], range: IncomeRange) {
  return orders.filter((order) => {
    const date = order.orderDate.slice(0, 10)
    if (range.from && date < range.from) return false
    if (range.to && date > range.to) return false
    return true
  })
}

function groupOrders<T extends string>(orders: OrderRecord[], keyForOrder: (order: OrderRecord) => T) {
  return orders.reduce((groups, order) => {
    const key = keyForOrder(order)
    const current = groups.get(key) ?? []
    current.push(order)
    groups.set(key, current)
    return groups
  }, new Map<T, OrderRecord[]>())
}

function roundMoney(value: number) {
  return value.toFixed(2)
}
