import { describe, expect, it } from 'vitest'
import { exportCustomersCsv } from '@/lib/services/export'
import { makeCustomer } from '@/test/fixtures'

describe('exportCustomersCsv', () => {
  it('exports only customers matching the selected status', () => {
    const csv = exportCustomersCsv([
      makeCustomer({ fullName: 'Repeat Buyer', customerStatus: 'Repeat' }),
      makeCustomer({ id: 'vip', fullName: 'VIP Buyer', customerStatus: 'VIP' }),
      makeCustomer({ id: 'risk', fullName: 'At Risk Buyer', customerStatus: 'AtRisk' }),
    ], 'VIP')

    expect(csv).toContain('name,email,phone,province,status,total_orders,total_spent,first_channel,last_channel')
    expect(csv).toContain('VIP Buyer')
    expect(csv).not.toContain('Repeat Buyer')
    expect(csv).not.toContain('At Risk Buyer')
  })
})
