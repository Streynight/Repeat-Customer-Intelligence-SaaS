import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AnalyticsClient } from '@/components/analytics/analytics-client'
import { createEmptyDataset } from '@/lib/empty-dataset'
import { makeCustomer, makeDataset, makeOrder } from '@/test/fixtures'
import type { IntelligenceDataset } from '@/lib/types'

let mockDataset: IntelligenceDataset = createEmptyDataset()
let mockLoading = false
let mockSearchParams = new URLSearchParams()
const push = vi.fn()

vi.mock('@/components/hooks/use-intelligence-dataset', () => ({
  useIntelligenceDataset: () => ({
    dataset: mockDataset,
    loading: mockLoading,
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => mockSearchParams,
}))

describe('AnalyticsClient', () => {
  beforeEach(() => {
    mockDataset = createEmptyDataset()
    mockLoading = false
    mockSearchParams = new URLSearchParams()
    push.mockReset()
  })

  it('renders an empty state for a new workspace', () => {
    render(<AnalyticsClient />)

    expect(screen.getByText('Deep analytics starts after import')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /import orders/i })).toHaveAttribute('href', '/imports')
  })

  it('shows analytics tabs and drill-down links', () => {
    const firstOrder = order('vip-1', 'shopee', '2026-04-01T00:00:00.000Z', 1200, 'Serum')
    const repeatOrder = order('vip-2', 'website', '2026-04-15T00:00:00.000Z', 1800, 'Cream')
    mockDataset = makeDataset([
      makeCustomer({
        id: 'vip-customer',
        fullName: 'Mali Wong',
        customerStatus: 'VIP',
        totalOrders: 2,
        totalSpent: 3000,
        firstChannel: 'shopee',
        lastChannel: 'website',
        firstOrderDate: firstOrder.orderDate,
        lastOrderDate: repeatOrder.orderDate,
        orders: [firstOrder, repeatOrder],
      }),
    ])

    render(<AnalyticsClient />)

    expect(screen.getByRole('tab', { name: /retention/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /cohorts/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /products/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /opportunities/i })).toBeInTheDocument()
    expect(linkByHref('/customers?rfmSegment=Champion&sort=totalSpent')).toBeInTheDocument()
    expect(linkByHref('/customers/vip-customer')).toBeInTheDocument()
  })

  it('renders product tab links from query state', () => {
    mockSearchParams = new URLSearchParams('tab=products')
    const firstOrder = order('vip-1', 'shopee', '2026-04-01T00:00:00.000Z', 1200, 'Serum')
    const repeatOrder = order('vip-2', 'website', '2026-04-15T00:00:00.000Z', 1800, 'Cream')
    mockDataset = makeDataset([
      makeCustomer({
        id: 'vip-customer',
        fullName: 'Mali Wong',
        customerStatus: 'VIP',
        totalOrders: 2,
        totalSpent: 3000,
        firstChannel: 'shopee',
        lastChannel: 'website',
        firstOrderDate: firstOrder.orderDate,
        lastOrderDate: repeatOrder.orderDate,
        orders: [firstOrder, repeatOrder],
      }),
    ])

    render(<AnalyticsClient />)

    expect(screen.getByText('Product repeat intelligence')).toBeInTheDocument()
    expect(linkByHref('/customers?product=Cream&sort=repeatRevenue')).toBeInTheDocument()
  })
})

function order(id: string, sourceChannel: 'shopee' | 'website', orderDate: string, totalAmount: number, productName: string) {
  return {
    ...makeOrder({ externalOrderId: id, sourceChannel, orderDate, totalAmount }),
    id,
    customerProfileId: 'vip-customer',
    items: [{ productName, quantity: 1, unitPrice: totalAmount }],
  }
}

function linkByHref(href: string) {
  return Array.from(document.querySelectorAll('a')).find((link) => link.getAttribute('href') === href)
}
