import type { CustomerProfile, IntelligenceDataset, SourceChannel } from '@/lib/types'

export function dashboardMetrics(dataset: IntelligenceDataset) {
  const repeatCustomers = dataset.customers.filter((customer) => customer.totalOrders >= 2)
  const vipCustomers = dataset.customers.filter((customer) => customer.customerStatus === 'VIP')
  const atRiskCustomers = dataset.customers.filter((customer) => customer.customerStatus === 'AtRisk')
  const repeatRevenue = repeatCustomers.reduce((sum, customer) => {
    const [, ...repeatOrders] = customer.orders
    return sum + repeatOrders.reduce((orderSum, order) => orderSum + order.totalAmount, 0)
  }, 0)

  return {
    totalCustomers: dataset.customers.length,
    repeatCustomers: repeatCustomers.length,
    repeatRate: dataset.customers.length ? repeatCustomers.length / dataset.customers.length : 0,
    vipCustomers: vipCustomers.length,
    atRiskCustomers: atRiskCustomers.length,
    repeatRevenue,
  }
}

export function repeatRevenueByChannel(customers: CustomerProfile[]) {
  const totals = new Map<SourceChannel, number>()

  for (const customer of customers) {
    const sortedOrders = [...customer.orders].sort((a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime())

    sortedOrders.slice(1).forEach((order) => {
      totals.set(order.sourceChannel, (totals.get(order.sourceChannel) ?? 0) + order.totalAmount)
    })
  }

  return Array.from(totals.entries()).map(([channel, revenue]) => ({ channel, revenue }))
}

export function customersByStatus(customers: CustomerProfile[]) {
  const totals = new Map<string, number>()
  customers.forEach((customer) => {
    totals.set(customer.customerStatus, (totals.get(customer.customerStatus) ?? 0) + 1)
  })
  return Array.from(totals.entries()).map(([status, count]) => ({ status, count }))
}

export function firstVsRepeatChannel(customers: CustomerProfile[]) {
  const totals = new Map<string, number>()

  for (const customer of customers.filter((item) => item.totalOrders >= 2)) {
    const key = `${customer.firstChannel} -> ${customer.lastChannel}`
    totals.set(key, (totals.get(key) ?? 0) + 1)
  }

  return Array.from(totals.entries()).map(([path, customers]) => ({ path, customers }))
}

export function monthlyRepeatTrend(customers: CustomerProfile[]) {
  const totals = new Map<string, number>()

  for (const customer of customers) {
    const sortedOrders = [...customer.orders].sort((a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime())
    sortedOrders.slice(1).forEach((order) => {
      const month = order.orderDate.slice(0, 7)
      totals.set(month, (totals.get(month) ?? 0) + order.totalAmount)
    })
  }

  return Array.from(totals.entries())
    .map(([month, revenue]) => ({ month, revenue }))
    .sort((a, b) => a.month.localeCompare(b.month))
}
