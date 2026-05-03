import type { CustomerProfile, CustomerStatus } from '@/lib/types'

export function classifyCustomer(
  customer: Pick<CustomerProfile, 'totalOrders' | 'totalSpent' | 'lastOrderDate'>,
  vipThreshold: number,
  today = new Date(),
): CustomerStatus {
  const daysSinceLastOrder = daysBetween(new Date(customer.lastOrderDate), today)

  if (daysSinceLastOrder >= 90) return 'Lost'
  if (daysSinceLastOrder >= 30) return 'AtRisk'
  if (customer.totalOrders >= 3 && customer.totalSpent >= vipThreshold) return 'VIP'
  if (customer.totalOrders >= 2) return 'Repeat'
  return 'New'
}

export function daysBetween(start: Date, end: Date) {
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000)
}
