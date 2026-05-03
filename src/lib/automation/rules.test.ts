import { describe, expect, it } from 'vitest'
import { makeCustomer, makeDataset, makeOrder } from '@/test/fixtures'
import { buildAutomationSignals } from '@/lib/automation/rules'

describe('automation rules', () => {
  it('creates revenue operating signals for VIP and churn-risk customers', () => {
    const dataset = makeDataset([
      makeCustomer({
        id: 'vip-1',
        customerStatus: 'VIP',
        totalOrders: 4,
        totalSpent: 20_000,
        lastOrderDate: '2026-04-01T00:00:00.000Z',
      }),
      makeCustomer({
        id: 'lost-1',
        customerStatus: 'Lost',
        totalOrders: 2,
        totalSpent: 5_000,
        lastOrderDate: '2025-12-01T00:00:00.000Z',
      }),
    ])

    const signals = buildAutomationSignals(dataset, new Date('2026-05-03T00:00:00.000Z'))

    expect(signals.map((signal) => signal.type)).toEqual(expect.arrayContaining(['vipDetected', 'winBack']))
  })

  it('detects sharp revenue anomalies between recent months', () => {
    const orders = [
      makeOrder({ externalOrderId: 'APR-1', orderDate: '2026-04-01T00:00:00.000Z', totalAmount: 10_000 }),
      makeOrder({ externalOrderId: 'MAY-1', orderDate: '2026-05-01T00:00:00.000Z', totalAmount: 2_000 }),
    ]
    const dataset = makeDataset([
      makeCustomer({
        orders: orders.map((order, index) => ({ ...order, id: `order-${index}`, customerProfileId: 'customer-1' })),
      }),
    ])

    expect(buildAutomationSignals(dataset).some((signal) => signal.type === 'revenueAnomaly')).toBe(true)
  })
})
