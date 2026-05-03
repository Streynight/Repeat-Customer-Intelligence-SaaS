import { describe, expect, it } from 'vitest'
import {
  buildIncomeSummary,
  buildMonthlyIncomeRows,
  buildVatSummary,
  defaultFinanceSettings,
  estimateThailandVat,
} from '@/lib/services/finance'
import { makeCustomer, makeDataset } from '@/test/fixtures'
import type { OrderRecord } from '@/lib/types'

describe('finance service', () => {
  it('estimates Thailand VAT from VAT-inclusive gross total', () => {
    expect(estimateThailandVat(1070, 0.07, true)).toBeCloseTo(70)
    expect(estimateThailandVat(1000, 0.07, false)).toBeCloseTo(70)
  })

  it('uses explicit tax amount instead of an estimate', () => {
    const dataset = makeDataset([
      makeCustomer({
        orders: [
          order('explicit-tax', '2026-04-01', 1070, {
            taxAmount: 40,
          }),
        ],
      }),
    ])

    const summary = buildIncomeSummary(dataset, defaultFinanceSettings)

    expect(summary.taxAmount).toBe(40)
    expect(summary.explicitTaxAmount).toBe(40)
    expect(summary.estimatedTaxAmount).toBe(0)
  })

  it('subtracts tax, platform fees, and refunds from net income snapshot', () => {
    const dataset = makeDataset([
      makeCustomer({
        orders: [
          order('net-order', '2026-04-01', 1070, {
            taxAmount: 70,
            platformFeeAmount: 50,
            refundAmount: 100,
            shippingAmount: 40,
            discountAmount: 30,
          }),
        ],
      }),
    ])

    const summary = buildIncomeSummary(dataset, defaultFinanceSettings)

    expect(summary.grossIncome).toBe(1070)
    expect(summary.netIncome).toBe(850)
    expect(summary.shippingAmount).toBe(40)
    expect(summary.discountAmount).toBe(30)
  })

  it('renders old orders without finance fields by estimating tax', () => {
    const dataset = makeDataset([makeCustomer({ orders: [order('old-order', '2026-04-01', 1070)] })])

    const summary = buildIncomeSummary(dataset, defaultFinanceSettings)

    expect(summary.taxAmount).toBeCloseTo(70)
    expect(summary.netIncome).toBeCloseTo(1000)
  })

  it('groups monthly income and VAT rows', () => {
    const dataset = makeDataset([
      makeCustomer({
        orders: [
          order('jan-order', '2026-01-10', 1070),
          order('feb-order', '2026-02-10', 2140, { taxAmount: 140 }),
        ],
      }),
    ])

    expect(buildMonthlyIncomeRows(dataset, defaultFinanceSettings).map((row) => row.month)).toEqual(['2026-01', '2026-02'])
    expect(buildVatSummary(dataset, defaultFinanceSettings)[1]).toMatchObject({
      month: '2026-02',
      explicitVat: 140,
      estimatedVat: 0,
      totalVat: 140,
    })
  })
})

function order(id: string, orderDate: string, totalAmount: number, overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id,
    customerProfileId: 'customer-1',
    externalOrderId: id,
    sourceChannel: 'shopee',
    customerNameRaw: 'Mali Wong',
    emailRaw: undefined,
    phoneRaw: undefined,
    lineIdRaw: undefined,
    provinceRaw: undefined,
    orderDate: `${orderDate}T00:00:00.000Z`,
    totalAmount,
    items: [{ productName: 'Serum', quantity: 1, unitPrice: totalAmount }],
    ...overrides,
  }
}
