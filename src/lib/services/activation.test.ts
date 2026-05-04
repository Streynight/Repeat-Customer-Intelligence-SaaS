import { describe, expect, it } from 'vitest'
import { createEmptyDataset } from '@/lib/empty-dataset'
import { buildActivationState } from '@/lib/services/activation'
import { makeCustomer, makeDataset, makeOrder } from '@/test/fixtures'

describe('buildActivationState', () => {
  it('keeps new tenants focused on first import', () => {
    const state = buildActivationState(createEmptyDataset())

    expect(state.progress).toBe(0)
    expect(state.completedSteps).toBe(0)
    expect(state.steps.map((step) => [step.id, step.done])).toEqual([
      ['import', false],
      ['identity', false],
      ['repeat', false],
      ['winback', false],
      ['sync', false],
    ])
    expect(state.nextAction).toMatchObject({
      title: 'Import 20-50 real orders first',
      href: '/imports',
    })
  })

  it('surfaces repeat, win-back, and sync activation state from real dataset inputs', () => {
    const firstOrder = {
      ...makeOrder({ externalOrderId: 'ORDER-1', totalAmount: 1200, orderDate: '2026-01-01T00:00:00.000Z' }),
      id: 'ORDER-1',
      customerProfileId: 'customer-1',
    }
    const repeatOrder = {
      ...makeOrder({ externalOrderId: 'ORDER-2', sourceChannel: 'tiktok', totalAmount: 1800, orderDate: '2026-02-01T00:00:00.000Z' }),
      id: 'ORDER-2',
      customerProfileId: 'customer-1',
    }
    const dataset = makeDataset([
      makeCustomer({
        customerStatus: 'AtRisk',
        totalOrders: 2,
        totalSpent: 3000,
        orders: [firstOrder, repeatOrder],
      }),
    ])

    const state = buildActivationState(dataset, { csvSyncConnectionCount: 1 })

    expect(state.progress).toBe(100)
    expect(state.completedSteps).toBe(5)
    expect(state.contactsWithIdentity).toBe(1)
    expect(state.repeatRevenue).toBe(1800)
    expect(state.atRiskValue).toBe(3000)
    expect(state.nextAction).toMatchObject({
      title: 'Expand from reporting into operating cadence',
      href: '/analytics',
    })
  })
})
