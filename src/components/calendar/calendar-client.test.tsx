import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CalendarClient } from '@/components/calendar/calendar-client'
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

describe('CalendarClient', () => {
  beforeEach(() => {
    mockDataset = createEmptyDataset()
    mockLoading = false
  })

  it('renders an empty calendar panel without fake orders or reminders', () => {
    render(<CalendarClient />)

    expect(screen.getByText('No calendar activity yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /import orders/i })).toHaveAttribute('href', '/imports')
    expect(screen.getByText('Orders this month')).toBeInTheDocument()
    expect(screen.getAllByText('0').length).toBeGreaterThan(0)
  })

  it('links repeat buyers and order rows to customer profiles', () => {
    const firstOrder = {
      ...makeOrder({ externalOrderId: 'SHP-1', sourceChannel: 'shopee', orderDate: '2026-01-01T00:00:00.000Z', totalAmount: 1000 }),
      id: 'SHP-1',
      customerProfileId: 'repeat-customer',
    }
    const repeatOrder = {
      ...makeOrder({ externalOrderId: 'TT-2', sourceChannel: 'tiktok', orderDate: '2026-02-01T00:00:00.000Z', totalAmount: 2200 }),
      id: 'TT-2',
      customerProfileId: 'repeat-customer',
    }
    mockDataset = makeDataset([
      makeCustomer({
        id: 'repeat-customer',
        fullName: 'Mali Wong',
        customerStatus: 'Repeat',
        totalOrders: 2,
        totalSpent: 3200,
        firstChannel: 'shopee',
        lastChannel: 'tiktok',
        firstOrderDate: firstOrder.orderDate,
        lastOrderDate: repeatOrder.orderDate,
        orders: [firstOrder, repeatOrder],
      }),
    ])

    render(<CalendarClient />)

    const linkedBuyer = screen.getAllByText('Mali Wong').find((item) => item.closest('a'))
    expect(linkedBuyer?.closest('a')).toHaveAttribute('href', '/customers/repeat-customer')
    expect(linkByHref('/customers?repeatChannel=tiktok&sort=repeatRevenue')).toBeInTheDocument()
  })
})

function linkByHref(href: string) {
  return Array.from(document.querySelectorAll('a')).find((link) => link.getAttribute('href') === href)
}
