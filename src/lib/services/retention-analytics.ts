import type { CustomerProfile, CustomerStatus, IntelligenceDataset, OrderRecord, SourceChannel } from '@/lib/types'

export type RfmSegment = 'Champion' | 'Loyal' | 'Potential' | 'New' | 'One-time' | 'At Risk' | 'Lost'

export const rfmSegments: RfmSegment[] = ['Champion', 'Loyal', 'Potential', 'New', 'One-time', 'At Risk', 'Lost']

export type RetentionSummary = {
  totalRevenue: number
  repeatRevenue: number
  repeatRevenueShare: number
  averageDaysToSecondOrder: number | null
  secondPurchaseConversion: number
  vipRevenue: number
  vipRevenueConcentration: number
  atRiskValue: number
  topRfmSegment?: RfmSegment
  topRepeatProduct?: string
}

export type CohortCell = {
  monthOffset: number
  activeCustomers: number
  revenue: number
  retentionRate: number
}

export type CohortRow = {
  cohortMonth: string
  cohortSize: number
  cells: CohortCell[]
}

export type CustomerRfmScore = {
  customerId: string
  customerName: string
  customerStatus: CustomerStatus
  recencyDays: number
  recencyScore: number
  frequencyScore: number
  monetaryScore: number
  totalScore: number
  segment: RfmSegment
  totalSpent: number
  totalOrders: number
}

export type ProductRepeatInsight = {
  productName: string
  revenue: number
  repeatRevenue: number
  orderCount: number
  customerCount: number
  repeatCustomerCount: number
  commonNextProducts: Array<{ productName: string; count: number }>
}

export type ChannelQualityInsight = {
  channel: SourceChannel
  firstChannelCustomers: number
  repeatCustomers: number
  repeatRate: number
  repeatRevenue: number
  averageDaysToRepeat: number | null
}

export type CustomerOpportunity = {
  id: string
  customerId: string
  customerName: string
  type: 'win-back' | 'second-purchase' | 'vip-protect' | 'cross-sell'
  priority: 'high' | 'medium' | 'low'
  title: string
  detail: string
  value: number
  customerStatus: CustomerStatus
  daysSinceLastOrder: number
  targetProduct?: string
}

export type RetentionAnalytics = {
  summary: RetentionSummary
  cohorts: CohortRow[]
  rfmScores: CustomerRfmScore[]
  productInsights: ProductRepeatInsight[]
  channelQuality: ChannelQualityInsight[]
  opportunities: CustomerOpportunity[]
}

export function buildRetentionAnalytics(
  dataset: IntelligenceDataset,
  options: { today?: Date } = {},
): RetentionAnalytics {
  const today = options.today ?? new Date()
  const repeatOrderIds = repeatOrderIdSet(dataset.customers)
  const rfmScores = buildCustomerRfmScores(dataset.customers, today)
  const productInsights = buildProductInsights(dataset.customers, repeatOrderIds)
  const channelQuality = buildChannelQuality(dataset.customers)
  const cohorts = buildCohorts(dataset.customers)
  const opportunities = buildOpportunities(dataset.customers, rfmScores, productInsights, today)
  const repeatRevenue = repeatRevenueForCustomers(dataset.customers)
  const totalRevenue = dataset.orders.reduce((sum, order) => sum + order.totalAmount, 0)
  const vipRevenue = dataset.customers
    .filter((customer) => customer.customerStatus === 'VIP')
    .reduce((sum, customer) => sum + customer.totalSpent, 0)
  const atRiskValue = dataset.customers
    .filter((customer) => customer.customerStatus === 'AtRisk' || customer.customerStatus === 'Lost')
    .reduce((sum, customer) => sum + customer.totalSpent, 0)
  const secondOrderGaps = dataset.customers
    .map((customer) => {
      const orders = sortedOrders(customer)
      if (orders.length < 2) return null
      return daysBetween(new Date(orders[0].orderDate), new Date(orders[1].orderDate))
    })
    .filter((value): value is number => value !== null)
  const rfmSegmentCounts = rfmScores.reduce((counts, score) => {
    counts.set(score.segment, (counts.get(score.segment) ?? 0) + 1)
    return counts
  }, new Map<RfmSegment, number>())

  return {
    summary: {
      totalRevenue,
      repeatRevenue,
      repeatRevenueShare: totalRevenue ? repeatRevenue / totalRevenue : 0,
      averageDaysToSecondOrder: average(secondOrderGaps),
      secondPurchaseConversion: dataset.customers.length ? secondOrderGaps.length / dataset.customers.length : 0,
      vipRevenue,
      vipRevenueConcentration: totalRevenue ? vipRevenue / totalRevenue : 0,
      atRiskValue,
      topRfmSegment: Array.from(rfmSegmentCounts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0],
      topRepeatProduct: productInsights[0]?.productName,
    },
    cohorts,
    rfmScores,
    productInsights,
    channelQuality,
    opportunities,
  }
}

export function buildCustomerRfmScores(customers: CustomerProfile[], today = new Date()): CustomerRfmScore[] {
  return customers.map((customer) => {
    const recencyDays = daysBetween(new Date(customer.lastOrderDate), today)
    const recencyScore = recencyScoreForDays(recencyDays)
    const frequencyScore = frequencyScoreForOrders(customer.totalOrders)
    const monetaryScore = monetaryScoreForCustomer(customer, customers)
    const segment = rfmSegmentForScores(customer.customerStatus, recencyScore, frequencyScore, monetaryScore, customer.totalOrders)

    return {
      customerId: customer.id,
      customerName: customer.fullName,
      customerStatus: customer.customerStatus,
      recencyDays,
      recencyScore,
      frequencyScore,
      monetaryScore,
      totalScore: recencyScore + frequencyScore + monetaryScore,
      segment,
      totalSpent: customer.totalSpent,
      totalOrders: customer.totalOrders,
    }
  }).sort((a, b) => b.totalScore - a.totalScore || b.totalSpent - a.totalSpent || a.customerName.localeCompare(b.customerName))
}

function buildCohorts(customers: CustomerProfile[]) {
  const rows = new Map<string, { customerIds: Set<string>; cells: Map<number, { customerIds: Set<string>; revenue: number }> }>()

  customers.forEach((customer) => {
    const orders = sortedOrders(customer)
    const firstOrder = orders[0]
    if (!firstOrder) return

    const cohortMonth = firstOrder.orderDate.slice(0, 7)
    const row = rows.get(cohortMonth) ?? { customerIds: new Set<string>(), cells: new Map() }
    row.customerIds.add(customer.id)

    orders.forEach((order) => {
      const offset = monthDifference(cohortMonth, order.orderDate.slice(0, 7))
      if (offset < 0 || offset > 5) return

      const cell = row.cells.get(offset) ?? { customerIds: new Set<string>(), revenue: 0 }
      cell.customerIds.add(customer.id)
      cell.revenue += order.totalAmount
      row.cells.set(offset, cell)
    })

    rows.set(cohortMonth, row)
  })

  return Array.from(rows.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 12)
    .map(([cohortMonth, row]) => {
      const cohortSize = row.customerIds.size

      return {
        cohortMonth,
        cohortSize,
        cells: Array.from({ length: 6 }, (_, monthOffset) => {
          const cell = row.cells.get(monthOffset)
          const activeCustomers = cell?.customerIds.size ?? 0

          return {
            monthOffset,
            activeCustomers,
            revenue: cell?.revenue ?? 0,
            retentionRate: cohortSize ? activeCustomers / cohortSize : 0,
          }
        }),
      }
    })
}

function buildProductInsights(customers: CustomerProfile[], repeatOrderIds: Set<string>) {
  const products = new Map<string, {
    productName: string
    revenue: number
    repeatRevenue: number
    orderIds: Set<string>
    customerIds: Set<string>
    repeatCustomerIds: Set<string>
    nextProducts: Map<string, number>
  }>()

  customers.forEach((customer) => {
    const orders = sortedOrders(customer)

    orders.forEach((order, orderIndex) => {
      order.items.forEach((item) => {
        const productName = item.productName.trim()
        if (!productName) return

        const current = products.get(productName) ?? {
          productName,
          revenue: 0,
          repeatRevenue: 0,
          orderIds: new Set<string>(),
          customerIds: new Set<string>(),
          repeatCustomerIds: new Set<string>(),
          nextProducts: new Map<string, number>(),
        }
        const revenue = item.quantity * item.unitPrice

        current.revenue += Number.isFinite(revenue) && revenue > 0 ? revenue : order.totalAmount
        current.orderIds.add(order.id)
        current.customerIds.add(customer.id)
        if (repeatOrderIds.has(order.id)) {
          current.repeatRevenue += Number.isFinite(revenue) && revenue > 0 ? revenue : order.totalAmount
          current.repeatCustomerIds.add(customer.id)
        }

        const nextOrder = orders[orderIndex + 1]
        nextOrder?.items.forEach((nextItem) => {
          const nextProductName = nextItem.productName.trim()
          if (nextProductName) {
            current.nextProducts.set(nextProductName, (current.nextProducts.get(nextProductName) ?? 0) + 1)
          }
        })

        products.set(productName, current)
      })
    })
  })

  return Array.from(products.values())
    .map((item) => ({
      productName: item.productName,
      revenue: item.revenue,
      repeatRevenue: item.repeatRevenue,
      orderCount: item.orderIds.size,
      customerCount: item.customerIds.size,
      repeatCustomerCount: item.repeatCustomerIds.size,
      commonNextProducts: Array.from(item.nextProducts.entries())
        .map(([productName, count]) => ({ productName, count }))
        .sort((a, b) => b.count - a.count || a.productName.localeCompare(b.productName))
        .slice(0, 3),
    }))
    .sort((a, b) => b.repeatRevenue - a.repeatRevenue || b.revenue - a.revenue || a.productName.localeCompare(b.productName))
}

function buildChannelQuality(customers: CustomerProfile[]) {
  const rows = new Map<SourceChannel, {
    channel: SourceChannel
    firstChannelCustomers: number
    repeatCustomers: number
    repeatRevenue: number
    daysToRepeat: number[]
  }>()

  customers.forEach((customer) => {
    const current = rows.get(customer.firstChannel) ?? {
      channel: customer.firstChannel,
      firstChannelCustomers: 0,
      repeatCustomers: 0,
      repeatRevenue: 0,
      daysToRepeat: [],
    }
    const orders = sortedOrders(customer)

    current.firstChannelCustomers += 1
    if (orders.length >= 2) {
      current.repeatCustomers += 1
      current.repeatRevenue += orders.slice(1).reduce((sum, order) => sum + order.totalAmount, 0)
      current.daysToRepeat.push(daysBetween(new Date(orders[0].orderDate), new Date(orders[1].orderDate)))
    }

    rows.set(customer.firstChannel, current)
  })

  return Array.from(rows.values())
    .map((row) => ({
      channel: row.channel,
      firstChannelCustomers: row.firstChannelCustomers,
      repeatCustomers: row.repeatCustomers,
      repeatRate: row.firstChannelCustomers ? row.repeatCustomers / row.firstChannelCustomers : 0,
      repeatRevenue: row.repeatRevenue,
      averageDaysToRepeat: average(row.daysToRepeat),
    }))
    .sort((a, b) => b.repeatRevenue - a.repeatRevenue || b.repeatRate - a.repeatRate)
}

function buildOpportunities(
  customers: CustomerProfile[],
  rfmScores: CustomerRfmScore[],
  productInsights: ProductRepeatInsight[],
  today: Date,
) {
  const rfmByCustomer = new Map(rfmScores.map((score) => [score.customerId, score]))
  const topProducts = productInsights.slice(0, 5).map((item) => item.productName)
  const opportunities: CustomerOpportunity[] = []

  customers.forEach((customer) => {
    const rfm = rfmByCustomer.get(customer.id)
    const daysSinceLastOrder = daysBetween(new Date(customer.lastOrderDate), today)

    if (customer.customerStatus === 'AtRisk' || customer.customerStatus === 'Lost' || rfm?.segment === 'At Risk' || rfm?.segment === 'Lost') {
      opportunities.push({
        id: `${customer.id}:win-back`,
        customerId: customer.id,
        customerName: customer.fullName,
        type: 'win-back',
        priority: 'high',
        title: 'Win back stale buyer',
        detail: `${customer.customerStatus} customer with ${customer.totalOrders} orders and no recent purchase.`,
        value: customer.totalSpent,
        customerStatus: customer.customerStatus,
        daysSinceLastOrder,
      })
    }

    if (customer.totalOrders === 1 && customer.customerStatus !== 'Lost') {
      opportunities.push({
        id: `${customer.id}:second-purchase`,
        customerId: customer.id,
        customerName: customer.fullName,
        type: 'second-purchase',
        priority: 'medium',
        title: 'Nudge second purchase',
        detail: 'One known order. This buyer is the next repeat conversion target.',
        value: customer.totalSpent,
        customerStatus: customer.customerStatus,
        daysSinceLastOrder,
      })
    }

    if (customer.customerStatus === 'VIP' || rfm?.segment === 'Champion') {
      opportunities.push({
        id: `${customer.id}:vip-protect`,
        customerId: customer.id,
        customerName: customer.fullName,
        type: 'vip-protect',
        priority: 'high',
        title: 'Protect VIP revenue',
        detail: 'High-value repeat buyer. Keep the next offer relevant and timely.',
        value: customer.totalSpent,
        customerStatus: customer.customerStatus,
        daysSinceLastOrder,
      })
    }

    const boughtProducts = productsForCustomer(customer)
    const targetProduct = topProducts.find((product) => !boughtProducts.has(product.toLowerCase()))
    if (targetProduct && customer.customerStatus !== 'Lost') {
      opportunities.push({
        id: `${customer.id}:cross-sell:${targetProduct}`,
        customerId: customer.id,
        customerName: customer.fullName,
        type: 'cross-sell',
        priority: customer.totalOrders >= 2 ? 'medium' : 'low',
        title: 'Cross-sell likely product',
        detail: `Has not bought ${targetProduct}, one of the strongest repeat products.`,
        value: customer.totalSpent,
        customerStatus: customer.customerStatus,
        daysSinceLastOrder,
        targetProduct,
      })
    }
  })

  const priorityRank = { high: 3, medium: 2, low: 1 }

  return opportunities
    .sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority] || b.value - a.value || a.customerName.localeCompare(b.customerName))
    .slice(0, 40)
}

function repeatRevenueForCustomers(customers: CustomerProfile[]) {
  return customers.reduce((sum, customer) => {
    const [, ...repeatOrders] = sortedOrders(customer)
    return sum + repeatOrders.reduce((orderSum, order) => orderSum + order.totalAmount, 0)
  }, 0)
}

function repeatOrderIdSet(customers: CustomerProfile[]) {
  const ids = new Set<string>()

  customers.forEach((customer) => {
    sortedOrders(customer).slice(1).forEach((order) => ids.add(order.id))
  })

  return ids
}

function sortedOrders(customer: CustomerProfile): OrderRecord[] {
  return [...customer.orders].sort((a, b) => a.orderDate.localeCompare(b.orderDate))
}

function recencyScoreForDays(days: number) {
  if (days <= 7) return 5
  if (days <= 30) return 4
  if (days <= 60) return 3
  if (days <= 90) return 2
  return 1
}

function frequencyScoreForOrders(orders: number) {
  if (orders >= 5) return 5
  if (orders >= 3) return 4
  if (orders === 2) return 2
  return 1
}

function monetaryScoreForCustomer(customer: CustomerProfile, customers: CustomerProfile[]) {
  const ranked = [...customers].sort((a, b) => a.totalSpent - b.totalSpent)
  const rank = ranked.findIndex((item) => item.id === customer.id)
  if (rank < 0) return 1
  const percentile = (rank + 1) / Math.max(ranked.length, 1)

  if (percentile > 0.8) return 5
  if (percentile > 0.6) return 4
  if (percentile > 0.4) return 3
  if (percentile > 0.2) return 2
  return 1
}

function rfmSegmentForScores(
  customerStatus: CustomerStatus,
  recencyScore: number,
  frequencyScore: number,
  monetaryScore: number,
  totalOrders: number,
): RfmSegment {
  if (customerStatus === 'Lost') return 'Lost'
  if (customerStatus === 'AtRisk') return 'At Risk'
  if (recencyScore === 1) return 'Lost'
  if (recencyScore === 2) return 'At Risk'
  if ((customerStatus === 'VIP' && recencyScore >= 3) || (recencyScore >= 4 && frequencyScore >= 4 && monetaryScore >= 4)) return 'Champion'
  if (recencyScore >= 3 && frequencyScore >= 4) return 'Loyal'
  if (totalOrders === 1 && recencyScore >= 4) return 'New'
  if (totalOrders === 1) return 'One-time'
  return 'Potential'
}

function productsForCustomer(customer: CustomerProfile) {
  return new Set(
    customer.orders
      .flatMap((order) => order.items)
      .map((item) => item.productName.trim().toLowerCase())
      .filter(Boolean),
  )
}

function monthDifference(fromMonth: string, toMonth: string) {
  const [fromYear, fromMonthNumber] = fromMonth.split('-').map(Number)
  const [toYear, toMonthNumber] = toMonth.split('-').map(Number)

  return (toYear - fromYear) * 12 + (toMonthNumber - fromMonthNumber)
}

function daysBetween(start: Date, end: Date) {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000))
}

function average(values: number[]) {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}
