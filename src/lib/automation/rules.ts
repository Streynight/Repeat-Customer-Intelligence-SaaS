import type { CustomerProfile, IntelligenceDataset } from '@/lib/types'

export type AutomationSignal = {
  type: 'churnAlert' | 'winBack' | 'repeatReminder' | 'vipDetected' | 'revenueAnomaly'
  customerId?: string
  title: string
  value: number
  priority: 'high' | 'medium' | 'low'
}

export function buildAutomationSignals(dataset: IntelligenceDataset, today = new Date()): AutomationSignal[] {
  const signals = dataset.customers.flatMap((customer) => signalsForCustomer(customer, today))
  const revenueAnomaly = detectRevenueAnomaly(dataset)

  return revenueAnomaly ? [...signals, revenueAnomaly] : signals
}

function signalsForCustomer(customer: CustomerProfile, today: Date): AutomationSignal[] {
  const daysSinceLastOrder = Math.floor((today.getTime() - new Date(customer.lastOrderDate).getTime()) / 86_400_000)
  const signals: AutomationSignal[] = []

  if (customer.customerStatus === 'VIP') {
    signals.push({
      type: 'vipDetected',
      customerId: customer.id,
      title: 'Protect VIP customer',
      value: customer.totalSpent,
      priority: 'high',
    })
  }

  if (customer.totalOrders === 1 && daysSinceLastOrder >= 14 && daysSinceLastOrder < 45) {
    signals.push({
      type: 'repeatReminder',
      customerId: customer.id,
      title: 'Trigger second purchase reminder',
      value: customer.totalSpent,
      priority: 'medium',
    })
  }

  if (customer.customerStatus === 'AtRisk' || customer.customerStatus === 'Lost') {
    signals.push({
      type: daysSinceLastOrder >= 90 ? 'winBack' : 'churnAlert',
      customerId: customer.id,
      title: daysSinceLastOrder >= 90 ? 'Start win-back flow' : 'Customer is approaching churn',
      value: customer.totalSpent,
      priority: 'high',
    })
  }

  return signals
}

function detectRevenueAnomaly(dataset: IntelligenceDataset): AutomationSignal | null {
  const monthlyRevenue = new Map<string, number>()
  dataset.orders.forEach((order) => {
    const month = order.orderDate.slice(0, 7)
    monthlyRevenue.set(month, (monthlyRevenue.get(month) ?? 0) + order.totalAmount)
  })

  const months = Array.from(monthlyRevenue.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  if (months.length < 2) return null

  const previous = months.at(-2)![1]
  const current = months.at(-1)![1]
  if (previous <= 0 || current / previous >= 0.75) return null

  return {
    type: 'revenueAnomaly',
    title: 'Repeat revenue dropped sharply',
    value: previous - current,
    priority: 'high',
  }
}
