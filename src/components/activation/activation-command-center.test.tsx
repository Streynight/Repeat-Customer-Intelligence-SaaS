import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ActivationCommandCenter } from '@/components/activation/activation-command-center'
import { createEmptyDataset } from '@/lib/empty-dataset'
import { makeCustomer, makeDataset, makeOrder } from '@/test/fixtures'

describe('ActivationCommandCenter', () => {
  it('guides empty workspaces to the first real import', () => {
    render(<ActivationCommandCenter dataset={createEmptyDataset()} />)

    expect(screen.getByText('Migration command center')).toBeInTheDocument()
    expect(screen.getByText('0/5 activated')).toBeInTheDocument()
    expect(screen.getByText('Import 20-50 real orders first')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /import orders/i })).toHaveAttribute('href', '/imports')
    expect(screen.getByText('Shopee')).toBeInTheDocument()
    expect(screen.getByText('Custom CSV')).toBeInTheDocument()
  })

  it('marks activated accounts complete when sync state is supplied', () => {
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

    render(<ActivationCommandCenter dataset={dataset} csvSyncConnectionCount={1} />)

    expect(screen.getByText('5/5 activated')).toBeInTheDocument()
    expect(screen.getByText('Expand from reporting into operating cadence')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open analytics/i })).toHaveAttribute('href', '/analytics')
  })
})
