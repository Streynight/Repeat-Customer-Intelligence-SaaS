import type { CustomerProfile, IntelligenceDataset, OrderInput, SourceChannel } from '@/lib/types'

export function makeOrder(overrides: Partial<OrderInput> = {}): OrderInput {
  return {
    externalOrderId: 'ORDER-1',
    sourceChannel: 'shopee',
    customerNameRaw: 'Mali Wong',
    emailRaw: 'mali@example.com',
    phoneRaw: '0812345001',
    lineIdRaw: 'mali_line',
    provinceRaw: 'Bangkok',
    orderDate: '2026-04-01T00:00:00.000Z',
    totalAmount: 1200,
    items: [{ productName: 'Serum', quantity: 1, unitPrice: 1200 }],
    ...overrides,
  }
}

export function makeCustomer(overrides: Partial<CustomerProfile> = {}): CustomerProfile {
  const order = makeOrder({
    externalOrderId: 'EXISTING-1',
    sourceChannel: 'instagram',
  })

  return {
    id: 'customer-1',
    fullName: 'Mali Wong',
    email: 'mali@example.com',
    phone: '0812345001',
    lineId: 'mali_line',
    province: 'Bangkok',
    firstChannel: 'instagram',
    lastChannel: 'instagram',
    totalOrders: 1,
    totalSpent: 1200,
    firstOrderDate: order.orderDate,
    lastOrderDate: order.orderDate,
    customerStatus: 'New',
    orders: [{ ...order, id: 'existing-order-1', customerProfileId: 'customer-1' }],
    ...overrides,
  }
}

export function makeDataset(customers: CustomerProfile[] = [makeCustomer()]): IntelligenceDataset {
  return {
    customers,
    orders: customers.flatMap((customer) => customer.orders),
    imports: [],
    vipThreshold: 3000,
  }
}

export function csvRow(overrides: Record<string, string> = {}) {
  return {
    order_id: 'ORDER-1',
    customer_name: 'Mali Wong',
    email: 'mali@example.com',
    phone: '0812345001',
    line_id: 'mali_line',
    province: 'Bangkok',
    order_date: '2026-04-02',
    total_amount: '1500',
    product_name: 'Serum',
    quantity: '1',
    unit_price: '1500',
    ...overrides,
  }
}

export function channelOrder(channel: SourceChannel, orderId: string, amount: number, date: string) {
  return makeOrder({
    externalOrderId: orderId,
    sourceChannel: channel,
    totalAmount: amount,
    orderDate: date,
  })
}
