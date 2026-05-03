import { describe, expect, it } from 'vitest'
import { buildRetentionAnalytics } from '@/lib/services/retention-analytics'
import { createEmptyDataset } from '@/lib/empty-dataset'
import type { CustomerProfile, IntelligenceDataset, OrderRecord, SourceChannel } from '@/lib/types'

const today = new Date('2026-05-01T00:00:00.000Z')

describe('retention analytics', () => {
  it('returns a complete empty analytics shape', () => {
    const analytics = buildRetentionAnalytics(createEmptyDataset(), { today })

    expect(analytics.summary.repeatRevenue).toBe(0)
    expect(analytics.summary.repeatRevenueShare).toBe(0)
    expect(analytics.summary.averageDaysToSecondOrder).toBeNull()
    expect(analytics.cohorts).toEqual([])
    expect(analytics.rfmScores).toEqual([])
    expect(analytics.productInsights).toEqual([])
    expect(analytics.channelQuality).toEqual([])
    expect(analytics.opportunities).toEqual([])
  })

  it('calculates retention summary metrics', () => {
    const analytics = buildRetentionAnalytics(dataset(), { today })

    expect(analytics.summary.totalRevenue).toBe(6550)
    expect(analytics.summary.repeatRevenue).toBe(900)
    expect(analytics.summary.repeatRevenueShare).toBeCloseTo(900 / 6550)
    expect(analytics.summary.averageDaysToSecondOrder).toBe(31)
    expect(analytics.summary.secondPurchaseConversion).toBeCloseTo(1 / 5)
    expect(analytics.summary.vipRevenueConcentration).toBeCloseTo(1000 / 6550)
    expect(analytics.summary.atRiskValue).toBe(4400)
  })

  it('builds cohort matrix by first-order month and M0-M5 offsets', () => {
    const analytics = buildRetentionAnalytics(dataset(), { today })
    const january = analytics.cohorts.find((row) => row.cohortMonth === '2026-01')

    expect(january?.cohortSize).toBe(2)
    expect(january?.cells[0]).toMatchObject({ monthOffset: 0, activeCustomers: 2, retentionRate: 1 })
    expect(january?.cells[1]).toMatchObject({ monthOffset: 1, activeCustomers: 1, revenue: 200 })
    expect(january?.cells[2]).toMatchObject({ monthOffset: 2, activeCustomers: 1, revenue: 300 })
    expect(january?.cells[3]).toMatchObject({ monthOffset: 3, activeCustomers: 1, revenue: 400 })
  })

  it('scores customers into RFM segments', () => {
    const analytics = buildRetentionAnalytics(dataset(), { today })
    const segments = Object.fromEntries(analytics.rfmScores.map((score) => [score.customerId, score.segment]))

    expect(segments['vip-buyer']).toBe('Champion')
    expect(segments['new-buyer']).toBe('New')
    expect(segments['risk-buyer']).toBe('At Risk')
    expect(segments['lost-buyer']).toBe('Lost')
  })

  it('builds product repeat insights with next products', () => {
    const analytics = buildRetentionAnalytics(dataset(), { today })
    const serum = analytics.productInsights.find((item) => item.productName === 'Serum')

    expect(serum).toMatchObject({
      revenue: 450,
      repeatRevenue: 200,
      repeatCustomerCount: 1,
      customerCount: 2,
    })
    expect(serum?.commonNextProducts.map((item) => item.productName)).toEqual(['Serum', 'Toner'])
  })

  it('creates opportunity rules for win-back, second purchase, VIP protection, and cross-sell', () => {
    const analytics = buildRetentionAnalytics(dataset(), { today })
    const types = new Set(analytics.opportunities.map((opportunity) => opportunity.type))

    expect(types.has('win-back')).toBe(true)
    expect(types.has('second-purchase')).toBe(true)
    expect(types.has('vip-protect')).toBe(true)
    expect(types.has('cross-sell')).toBe(true)
  })
})

function dataset(): IntelligenceDataset {
  const customers = [
    customer('vip-buyer', 'Mali VIP', 'VIP', 'shopee', [
      order('vip-1', 'shopee', '2026-01-10', 100, 'Serum'),
      order('vip-2', 'website', '2026-02-10', 200, 'Serum'),
      order('vip-3', 'website', '2026-03-10', 300, 'Toner'),
      order('vip-4', 'website', '2026-04-20', 400, 'Cream'),
    ]),
    customer('new-buyer', 'Nok New', 'New', 'tiktok', [
      order('new-1', 'tiktok', '2026-04-15', 150, 'Serum'),
    ]),
    customer('risk-buyer', 'Beam Risk', 'AtRisk', 'facebook', [
      order('risk-1', 'facebook', '2026-01-01', 500, 'Cream'),
    ]),
    customer('lost-buyer', 'Ann Lost', 'Lost', 'csv', [
      order('lost-1', 'csv', '2025-10-01', 3900, 'Oil'),
    ]),
    customer('cross-sell-buyer', 'Pim Cross', 'New', 'instagram', [
      order('cross-1', 'instagram', '2026-04-18', 1000, 'Mask'),
    ]),
  ]

  return {
    customers,
    orders: customers.flatMap((item) => item.orders),
    imports: [],
    vipThreshold: 800,
  }
}

function customer(
  id: string,
  fullName: string,
  customerStatus: CustomerProfile['customerStatus'],
  firstChannel: SourceChannel,
  orders: OrderRecord[],
): CustomerProfile {
  const withCustomerId = orders.map((item) => ({ ...item, customerProfileId: id }))

  return {
    id,
    fullName,
    email: `${id}@example.com`,
    phone: undefined,
    lineId: undefined,
    province: undefined,
    firstChannel,
    lastChannel: withCustomerId.at(-1)?.sourceChannel ?? firstChannel,
    totalOrders: withCustomerId.length,
    totalSpent: withCustomerId.reduce((sum, item) => sum + item.totalAmount, 0),
    firstOrderDate: withCustomerId[0].orderDate,
    lastOrderDate: withCustomerId.at(-1)?.orderDate ?? withCustomerId[0].orderDate,
    customerStatus,
    orders: withCustomerId,
  }
}

function order(id: string, sourceChannel: SourceChannel, orderDate: string, totalAmount: number, productName: string): OrderRecord {
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
