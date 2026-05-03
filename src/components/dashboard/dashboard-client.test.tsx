import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardClient } from '@/components/dashboard/dashboard-client'
import { createEmptyDataset } from '@/lib/empty-dataset'
import { makeCustomer, makeDataset, makeOrder } from '@/test/fixtures'
import type { IntelligenceDataset } from '@/lib/types'

let mockDataset: IntelligenceDataset = createEmptyDataset()
let mockLoading = false

vi.mock('@/lib/use-intelligence-dataset', () => ({
  useIntelligenceDataset: () => ({
    dataset: mockDataset,
    loading: mockLoading,
  }),
}))

describe('DashboardClient', () => {
  beforeEach(() => {
    mockDataset = createEmptyDataset()
    mockLoading = false
  })

  it('shows a clean import-first state instead of demo metrics', () => {
    render(<DashboardClient />)

    expect(screen.getByText('Start with your first order import')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /import orders/i })).toHaveAttribute('href', '/imports')
    expect(screen.getByText('No customer, order, revenue, or import records yet.')).toBeInTheDocument()
  })

  it('links dashboard metrics to the customer explorer filters', () => {
    const repeatOrder = (externalOrderId: string, sourceChannel: 'shopee' | 'tiktok', orderDate: string, totalAmount: number) => ({
      ...makeOrder({ externalOrderId, sourceChannel, orderDate, totalAmount }),
      id: externalOrderId,
      customerProfileId: 'repeat-customer',
    })
    mockDataset = makeDataset([
      makeCustomer({
        id: 'repeat-customer',
        fullName: 'Mali Wong',
        customerStatus: 'Repeat',
        totalOrders: 2,
        totalSpent: 3200,
        firstChannel: 'shopee',
        lastChannel: 'tiktok',
        firstOrderDate: '2026-01-01T00:00:00.000Z',
        lastOrderDate: '2026-02-01T00:00:00.000Z',
        orders: [
          repeatOrder('SHP-1', 'shopee', '2026-01-01T00:00:00.000Z', 1000),
          repeatOrder('TT-2', 'tiktok', '2026-02-01T00:00:00.000Z', 2200),
        ],
      }),
    ])

    render(<DashboardClient />)

    expect(screen.getByText('Total income').closest('a')).toHaveAttribute('href', '/income')
    expect(screen.getByText('Bought again').closest('a')).toHaveAttribute('href', '/customers?segment=repeat')
    expect(screen.getByText('Repeat revenue').closest('a')).toHaveAttribute('href', '/customers?segment=repeat&sort=repeatRevenue')
    expect(screen.getByText('Open deep analytics').closest('a')).toHaveAttribute('href', '/analytics')
    expect(linkByHref('/customers?repeatChannel=tiktok&sort=repeatRevenue')).toBeInTheDocument()
  })
})

function linkByHref(href: string) {
  return Array.from(document.querySelectorAll('a')).find((link) => link.getAttribute('href') === href)
}
