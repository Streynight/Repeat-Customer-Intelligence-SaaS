import { describe, expect, it } from 'vitest'
import { classifyCustomer } from '@/lib/services/classification'

const today = new Date('2026-05-01T00:00:00.000Z')

describe('classifyCustomer', () => {
  it('classifies New and Repeat customers by order count', () => {
    expect(classifyCustomer({ totalOrders: 1, totalSpent: 1000, lastOrderDate: '2026-04-25T00:00:00.000Z' }, 3000, today)).toBe('New')
    expect(classifyCustomer({ totalOrders: 2, totalSpent: 2000, lastOrderDate: '2026-04-25T00:00:00.000Z' }, 3000, today)).toBe('Repeat')
  })

  it('classifies VIP by order count and spend threshold', () => {
    expect(classifyCustomer({ totalOrders: 3, totalSpent: 5000, lastOrderDate: '2026-04-25T00:00:00.000Z' }, 3000, today)).toBe('VIP')
  })

  it('classifies At Risk and Lost by recency before spend rules', () => {
    expect(classifyCustomer({ totalOrders: 4, totalSpent: 9000, lastOrderDate: '2026-03-15T00:00:00.000Z' }, 3000, today)).toBe('AtRisk')
    expect(classifyCustomer({ totalOrders: 4, totalSpent: 9000, lastOrderDate: '2026-01-01T00:00:00.000Z' }, 3000, today)).toBe('Lost')
  })
})
