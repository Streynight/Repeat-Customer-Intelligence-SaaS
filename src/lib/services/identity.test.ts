import { describe, expect, it } from 'vitest'
import { resolveCustomerIdentity } from '@/lib/services/identity'
import { makeCustomer, makeOrder } from '@/test/fixtures'

describe('resolveCustomerIdentity', () => {
  it('matches by exact normalized phone first', () => {
    const customer = makeCustomer({ phone: '081-234-5001', email: 'other@example.com' })
    const match = resolveCustomerIdentity([customer], makeOrder({ phoneRaw: '0812345001' }))

    expect(match?.customer.id).toBe(customer.id)
    expect(match?.strategy).toBe('phone exact match')
  })

  it('matches by email when phone is absent', () => {
    const customer = makeCustomer({ email: 'mali@example.com', phone: undefined })
    const match = resolveCustomerIdentity([customer], makeOrder({ phoneRaw: undefined, emailRaw: 'MALI@example.com' }))

    expect(match?.customer.id).toBe(customer.id)
    expect(match?.strategy).toBe('email exact match')
  })

  it('matches by line ID when phone and email are absent', () => {
    const customer = makeCustomer({ lineId: 'line_mali', email: undefined, phone: undefined })
    const match = resolveCustomerIdentity([customer], makeOrder({ phoneRaw: undefined, emailRaw: undefined, lineIdRaw: 'LINE_MALI' }))

    expect(match?.customer.id).toBe(customer.id)
    expect(match?.strategy).toBe('line_id exact match')
  })

  it('matches by fuzzy full name as the fallback', () => {
    const customer = makeCustomer({ fullName: 'Siriporn Chai', email: undefined, phone: undefined, lineId: undefined })
    const match = resolveCustomerIdentity([customer], makeOrder({
      customerNameRaw: 'Siriporn Chaii',
      phoneRaw: undefined,
      emailRaw: undefined,
      lineIdRaw: undefined,
    }))

    expect(match?.customer.id).toBe(customer.id)
    expect(match?.strategy).toBe('fuzzy full_name match')
  })
})
