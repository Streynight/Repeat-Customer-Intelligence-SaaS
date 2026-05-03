import type { CustomerProfile, OrderInput } from '@/lib/types'

const normalize = (value?: string) => value?.trim().toLowerCase() || ''
const normalizePhone = (value?: string) => value?.replace(/\D/g, '') || ''

export function resolveCustomerIdentity(customers: CustomerProfile[], order: OrderInput) {
  const phone = normalizePhone(order.phoneRaw)
  const email = normalize(order.emailRaw)
  const lineId = normalize(order.lineIdRaw)
  const name = normalize(order.customerNameRaw)

  if (phone) {
    const match = customers.find((customer) => normalizePhone(customer.phone) === phone)
    if (match) return { customer: match, confidence: 1, strategy: 'phone exact match' }
  }

  if (email) {
    const match = customers.find((customer) => normalize(customer.email) === email)
    if (match) return { customer: match, confidence: 0.95, strategy: 'email exact match' }
  }

  if (lineId) {
    const match = customers.find((customer) => normalize(customer.lineId) === lineId)
    if (match) return { customer: match, confidence: 0.9, strategy: 'line_id exact match' }
  }

  if (name) {
    const ranked = customers
      .map((customer) => ({
        customer,
        score: similarity(name, normalize(customer.fullName)),
      }))
      .sort((a, b) => b.score - a.score)

    if (ranked[0]?.score >= 0.86) {
      return {
        customer: ranked[0].customer,
        confidence: ranked[0].score,
        strategy: 'fuzzy full_name match',
      }
    }
  }

  return null
}

export function mergeOrderIntoCustomer(customer: CustomerProfile, order: OrderInput, vipThreshold: number) {
  const orders = [
    ...customer.orders,
    {
      ...order,
      id: order.externalOrderId || crypto.randomUUID(),
      customerProfileId: customer.id,
    },
  ].sort((a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime())
  const totalSpent = orders.reduce((sum, item) => sum + item.totalAmount, 0)
  const firstOrder = orders[0]
  const lastOrder = orders.at(-1)!

  return {
    ...customer,
    email: customer.email || order.emailRaw,
    phone: customer.phone || order.phoneRaw,
    lineId: customer.lineId || order.lineIdRaw,
    province: customer.province || order.provinceRaw,
    totalOrders: orders.length,
    totalSpent,
    firstChannel: firstOrder.sourceChannel,
    lastChannel: lastOrder.sourceChannel,
    firstOrderDate: firstOrder.orderDate,
    lastOrderDate: lastOrder.orderDate,
    customerStatus: customerStatusFromOrders(orders.length, totalSpent, lastOrder.orderDate, vipThreshold),
    orders,
  } satisfies CustomerProfile
}

export function createCustomerFromOrder(order: OrderInput, vipThreshold: number): CustomerProfile {
  const id = crypto.randomUUID()
  const customer: CustomerProfile = {
    id,
    fullName: order.customerNameRaw || 'Unknown customer',
    email: order.emailRaw,
    phone: order.phoneRaw,
    lineId: order.lineIdRaw,
    province: order.provinceRaw,
    firstChannel: order.sourceChannel,
    lastChannel: order.sourceChannel,
    totalOrders: 0,
    totalSpent: 0,
    firstOrderDate: order.orderDate,
    lastOrderDate: order.orderDate,
    customerStatus: 'New',
    orders: [],
  }

  return mergeOrderIntoCustomer(customer, order, vipThreshold)
}

function customerStatusFromOrders(
  totalOrders: number,
  totalSpent: number,
  lastOrderDate: string,
  vipThreshold: number,
) {
  const daysSinceLastOrder = Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / 86_400_000)

  if (daysSinceLastOrder >= 90) return 'Lost'
  if (daysSinceLastOrder >= 30) return 'AtRisk'
  if (totalOrders >= 3 && totalSpent >= vipThreshold) return 'VIP'
  if (totalOrders >= 2) return 'Repeat'
  return 'New'
}

function similarity(a: string, b: string) {
  if (!a || !b) return 0
  const distance = levenshtein(a, b)
  return 1 - distance / Math.max(a.length, b.length)
}

function levenshtein(a: string, b: string) {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i])

  for (let j = 0; j <= a.length; j += 1) matrix[0][j] = j

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      matrix[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
    }
  }

  return matrix[b.length][a.length]
}
