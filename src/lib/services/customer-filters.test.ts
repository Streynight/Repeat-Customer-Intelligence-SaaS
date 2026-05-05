import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildCustomersHref,
  customerMatchesProduct,
  customerMatchesRepeatChannel,
  filterCustomers,
  repeatRevenueForCustomer,
  sortCustomers,
} from '@/lib/services/customer-filters'
import type { CustomerProfile, OrderRecord, SourceChannel } from '@/lib/types'

describe('customer filters', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-20T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const customers = [
    customer('repeat-shopee', 'Mali Wong', 'Repeat', 3200, [
      order('m-1', 'shopee', '2026-01-01', 1000),
      order('m-2', 'tiktok', '2026-02-01', 2200),
    ], {
      email: 'mali@example.com',
      phone: '0812345001',
      firstChannel: 'shopee',
      lastChannel: 'tiktok',
    }),
    customer('vip-web', 'Pim Store', 'VIP', 7400, [
      order('p-1', 'instagram', '2026-01-05', 2000),
      order('p-2', 'website', '2026-02-05', 2500),
      order('p-3', 'website', '2026-03-05', 2900),
    ], {
      email: 'pim@example.com',
      phone: '0890000000',
      firstChannel: 'instagram',
      lastChannel: 'website',
    }),
    customer('risk-buyer', 'Niran Cha', 'AtRisk', 1900, [
      order('n-1', 'facebook', '2026-01-10', 1900),
    ], {
      email: 'niran@example.com',
      phone: '0877777777',
      firstChannel: 'facebook',
      lastChannel: 'facebook',
    }),
    customer('lost-buyer', 'Arisa P', 'Lost', 900, [
      order('a-1', 'csv', '2025-10-10', 900),
    ], {
      email: 'arisa@example.com',
      phone: '0822222222',
      firstChannel: 'csv',
      lastChannel: 'csv',
    }),
  ]

  it('filters repeat segment by customers with at least two orders', () => {
    expect(filterCustomers(customers, { segment: 'repeat' }).map((item) => item.id)).toEqual([
      'repeat-shopee',
      'vip-web',
    ])
  })

  it('filters win-back segment by AtRisk and Lost customers', () => {
    expect(filterCustomers(customers, { segment: 'winback' }).map((item) => item.id)).toEqual([
      'risk-buyer',
      'lost-buyer',
    ])
  })

  it('filters exact VIP status', () => {
    expect(filterCustomers(customers, { status: 'VIP' }).map((item) => item.id)).toEqual(['vip-web'])
  })

  it('filters first and last channel path', () => {
    expect(filterCustomers(customers, { firstChannel: 'shopee', lastChannel: 'tiktok' }).map((item) => item.id)).toEqual([
      'repeat-shopee',
    ])
  })

  it('matches repeat channels only after the first order', () => {
    expect(customerMatchesRepeatChannel(customers[0], 'tiktok')).toBe(true)
    expect(customerMatchesRepeatChannel(customers[0], 'shopee')).toBe(false)
    expect(filterCustomers(customers, { repeatChannel: 'website' }).map((item) => item.id)).toEqual(['vip-web'])
  })

  it('filters RFM segments and product purchase history', () => {
    expect(filterCustomers(customers, { rfmSegment: 'Champion' }).map((item) => item.id)).toEqual(['vip-web'])
    expect(filterCustomers(customers, { rfmSegment: 'At Risk' }).map((item) => item.id)).toEqual(['risk-buyer'])
    expect(customerMatchesProduct(customers[0], 'Serum')).toBe(true)
    expect(customerMatchesProduct(customers[0], 'Cream')).toBe(false)
    expect(filterCustomers(customers, { product: 'Serum' }).map((item) => item.id)).toEqual(['repeat-shopee'])
  })

  it('searches by name, email, and phone', () => {
    expect(filterCustomers(customers, { search: 'mali' }).map((item) => item.id)).toEqual(['repeat-shopee'])
    expect(filterCustomers(customers, { search: 'pim@example.com' }).map((item) => item.id)).toEqual(['vip-web'])
    expect(filterCustomers(customers, { search: '0877777777' }).map((item) => item.id)).toEqual(['risk-buyer'])
  })

  it('sorts by total spent, last order, total orders, and repeat revenue', () => {
    expect(sortCustomers(customers, 'totalSpent')[0].id).toBe('vip-web')
    expect(sortCustomers(customers, 'lastOrder')[0].id).toBe('vip-web')
    expect(sortCustomers(customers, 'totalOrders')[0].id).toBe('vip-web')
    expect(sortCustomers(customers, 'repeatRevenue')[0].id).toBe('vip-web')
    expect(repeatRevenueForCustomer(customers[1])).toBe(5400)
  })

  it('builds customer explorer hrefs from filters', () => {
    expect(buildCustomersHref({ segment: 'repeat', repeatChannel: 'website', rfmSegment: 'Champion', product: 'Serum', sort: 'repeatRevenue' })).toBe(
      '/customers?segment=repeat&repeatChannel=website&rfmSegment=Champion&product=Serum&sort=repeatRevenue',
    )
  })
})

function customer(
  id: string,
  fullName: string,
  customerStatus: CustomerProfile['customerStatus'],
  totalSpent: number,
  orders: OrderRecord[],
  overrides: Partial<CustomerProfile> = {},
): CustomerProfile {
  return {
    id,
    fullName,
    email: undefined,
    phone: undefined,
    lineId: undefined,
    province: undefined,
    firstChannel: orders[0].sourceChannel,
    lastChannel: orders.at(-1)?.sourceChannel ?? orders[0].sourceChannel,
    totalOrders: orders.length,
    totalSpent,
    firstOrderDate: orders[0].orderDate,
    lastOrderDate: orders.at(-1)?.orderDate ?? orders[0].orderDate,
    customerStatus,
    orders: orders.map((item) => ({ ...item, customerProfileId: id })),
    ...overrides,
  }
}

function order(id: string, sourceChannel: SourceChannel, orderDate: string, totalAmount: number): OrderRecord {
  const productName = id.startsWith('m-') ? 'Serum' : 'Product'

  return {
    id,
    customerProfileId: '',
    externalOrderId: id,
    sourceChannel,
    customerNameRaw: 'Buyer',
    emailRaw: undefined,
    phoneRaw: undefined,
    lineIdRaw: undefined,
    provinceRaw: undefined,
    orderDate: `${orderDate}T00:00:00.000Z`,
    totalAmount,
    items: [{ productName, quantity: 1, unitPrice: totalAmount }],
  }
}
