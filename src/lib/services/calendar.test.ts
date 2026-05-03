import { describe, expect, it } from 'vitest'
import { buildCalendarMonth, getDefaultCalendarMonth } from '@/lib/services/calendar'
import { channelOrder, makeCustomer, makeDataset } from '@/test/fixtures'

describe('calendar insights', () => {
  it('uses the latest order month as the default calendar month', () => {
    const dataset = makeDataset([
      makeCustomer({
        orders: [
          { ...channelOrder('shopee', 'OLD', 1000, '2026-03-02T00:00:00.000Z'), id: 'old-order', customerProfileId: 'customer-1' },
          { ...channelOrder('website', 'NEW', 2000, '2026-05-09T00:00:00.000Z'), id: 'new-order', customerProfileId: 'customer-1' },
        ],
      }),
    ])

    expect(getDefaultCalendarMonth(dataset)).toBe('2026-05')
  })

  it('counts repeat orders and repeat revenue by day', () => {
    const dataset = makeDataset([
      makeCustomer({
        id: 'repeat-customer',
        totalOrders: 2,
        orders: [
          { ...channelOrder('shopee', 'FIRST', 1000, '2026-04-01T00:00:00.000Z'), id: 'first-order', customerProfileId: 'repeat-customer' },
          { ...channelOrder('tiktok', 'REPEAT', 2500, '2026-04-10T00:00:00.000Z'), id: 'repeat-order', customerProfileId: 'repeat-customer' },
        ],
      }),
    ])

    const month = buildCalendarMonth(dataset, '2026-04')
    const day = month.days.find((item) => item.date === '2026-04-10')

    expect(day?.orderCount).toBe(1)
    expect(day?.repeatOrderCount).toBe(1)
    expect(day?.repeatRevenue).toBe(2500)
    expect(day?.topChannel).toBe('tiktok')
  })

  it('dedupes repeat customers by day and sorts them by repeat revenue', () => {
    const dataset = makeDataset([
      makeCustomer({
        id: 'buyer-a',
        fullName: 'Mali Repeat',
        totalOrders: 3,
        orders: [
          { ...channelOrder('shopee', 'A-FIRST', 1000, '2026-04-01T00:00:00.000Z'), id: 'a-first', customerProfileId: 'buyer-a' },
          { ...channelOrder('tiktok', 'A-REPEAT-1', 2200, '2026-04-10T00:00:00.000Z'), id: 'a-repeat-1', customerProfileId: 'buyer-a' },
          { ...channelOrder('website', 'A-REPEAT-2', 1800, '2026-04-10T00:00:00.000Z'), id: 'a-repeat-2', customerProfileId: 'buyer-a' },
        ],
      }),
      makeCustomer({
        id: 'buyer-b',
        fullName: 'Pim Again',
        totalOrders: 2,
        orders: [
          { ...channelOrder('instagram', 'B-FIRST', 900, '2026-04-02T00:00:00.000Z'), id: 'b-first', customerProfileId: 'buyer-b' },
          { ...channelOrder('facebook', 'B-REPEAT', 1500, '2026-04-10T00:00:00.000Z'), id: 'b-repeat', customerProfileId: 'buyer-b' },
        ],
      }),
    ])

    const month = buildCalendarMonth(dataset, '2026-04')
    const day = month.days.find((item) => item.date === '2026-04-10')

    expect(day?.repeatCustomers).toEqual([
      {
        customerId: 'buyer-a',
        customerName: 'Mali Repeat',
        repeatOrders: 2,
        repeatRevenue: 4000,
        sourceChannels: ['tiktok', 'website'],
      },
      {
        customerId: 'buyer-b',
        customerName: 'Pim Again',
        repeatOrders: 1,
        repeatRevenue: 1500,
        sourceChannels: ['facebook'],
      },
    ])
  })

  it('creates customer follow-up reminders thirty days after last order', () => {
    const dataset = makeDataset([
      makeCustomer({
        id: 'risk-customer',
        fullName: 'At Risk Buyer',
        customerStatus: 'AtRisk',
        totalOrders: 3,
        totalSpent: 5000,
        lastOrderDate: '2026-04-01T00:00:00.000Z',
      }),
    ])

    const month = buildCalendarMonth(dataset, '2026-05')
    const reminderDay = month.days.find((item) => item.date === '2026-05-01')

    expect(reminderDay?.reminders).toEqual([
      expect.objectContaining({
        customerId: 'risk-customer',
        customerName: 'At Risk Buyer',
        priority: 'win-back',
      }),
    ])
  })

  it('keeps empty days renderable in a seven-day grid', () => {
    const month = buildCalendarMonth(makeDataset([]), '2026-04')
    const emptyDay = month.days.find((item) => item.date === '2026-04-15')

    expect(month.weeks).toHaveLength(6)
    expect(month.weeks.every((week) => week.length === 7)).toBe(true)
    expect(emptyDay).toEqual(
      expect.objectContaining({
        orderCount: 0,
        repeatOrderCount: 0,
        revenue: 0,
        repeatRevenue: 0,
        repeatCustomers: [],
        orders: [],
        reminders: [],
      }),
    )
  })
})
