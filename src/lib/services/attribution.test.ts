import { describe, expect, it } from 'vitest'
import { firstVsRepeatChannel, repeatRevenueByChannel } from '@/lib/services/attribution'
import { channelOrder, makeCustomer } from '@/test/fixtures'

describe('attribution services', () => {
  it('calculates repeat revenue by repeat order channel', () => {
    const customer = makeCustomer({
      orders: [
        { ...channelOrder('shopee', 'S-1', 1000, '2026-01-01T00:00:00.000Z'), id: '1', customerProfileId: 'customer-1' },
        { ...channelOrder('tiktok', 'T-1', 1500, '2026-02-01T00:00:00.000Z'), id: '2', customerProfileId: 'customer-1' },
        { ...channelOrder('website', 'W-1', 2500, '2026-03-01T00:00:00.000Z'), id: '3', customerProfileId: 'customer-1' },
      ],
    })

    expect(repeatRevenueByChannel([customer])).toEqual([
      { channel: 'tiktok', revenue: 1500 },
      { channel: 'website', revenue: 2500 },
    ])
  })

  it('counts first-to-latest repeat channel paths', () => {
    const customers = [
      makeCustomer({ firstChannel: 'shopee', lastChannel: 'tiktok', totalOrders: 2 }),
      makeCustomer({ id: 'customer-2', firstChannel: 'shopee', lastChannel: 'tiktok', totalOrders: 3 }),
      makeCustomer({ id: 'customer-3', firstChannel: 'instagram', lastChannel: 'website', totalOrders: 1 }),
    ]

    expect(firstVsRepeatChannel(customers)).toEqual([
      { path: 'shopee -> tiktok', customers: 2 },
    ])
  })
})
