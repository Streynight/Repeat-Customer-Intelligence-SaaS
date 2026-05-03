import type { CustomerProfile, IntelligenceDataset } from '@/lib/types'

export type OperatorInsight = {
  title: string
  explanation: string
  recommendedAction: string
  revenueImpact: number
}

export function summarizeCustomerHealth(customer: CustomerProfile): OperatorInsight {
  const lastOrderDate = customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString('en-US') : 'unknown'

  if (customer.customerStatus === 'VIP') {
    return {
      title: 'VIP customer should be protected',
      explanation: `${customer.fullName} has ${customer.totalOrders} orders and ${formatCurrency(customer.totalSpent)} lifetime revenue.`,
      recommendedAction: 'Prioritize retention, early access offers, and service recovery monitoring.',
      revenueImpact: customer.totalSpent,
    }
  }

  if (customer.customerStatus === 'AtRisk' || customer.customerStatus === 'Lost') {
    return {
      title: 'Customer revenue is at risk',
      explanation: `${customer.fullName} last ordered on ${lastOrderDate} and is now classified as ${customer.customerStatus}.`,
      recommendedAction: 'Trigger a win-back or replenishment offer based on the last purchased product.',
      revenueImpact: customer.totalSpent,
    }
  }

  return {
    title: 'Customer is still developing',
    explanation: `${customer.fullName} has ${customer.totalOrders} known order${customer.totalOrders === 1 ? '' : 's'}.`,
    recommendedAction: 'Move the customer toward a second purchase before the repeat window closes.',
    revenueImpact: customer.totalSpent,
  }
}

export function explainRetentionChange(dataset: IntelligenceDataset): OperatorInsight {
  const repeatCustomers = dataset.customers.filter((customer) => customer.totalOrders >= 2)
  const repeatRevenue = repeatCustomers.reduce((sum, customer) => {
    const repeatOrders = [...customer.orders].sort((a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime()).slice(1)
    return sum + repeatOrders.reduce((orderSum, order) => orderSum + order.totalAmount, 0)
  }, 0)
  const repeatRate = dataset.customers.length ? repeatCustomers.length / dataset.customers.length : 0

  return {
    title: 'Repeat revenue operating summary',
    explanation: `${Math.round(repeatRate * 100)}% of known customers have repeated and generated ${formatCurrency(repeatRevenue)} repeat revenue.`,
    recommendedAction: 'Rank channels by repeat revenue, then build win-back and second-purchase workflows for the highest-value segments.',
    revenueImpact: repeatRevenue,
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(value)
}
