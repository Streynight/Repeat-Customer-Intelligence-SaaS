import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CalendarClient } from '@/components/calendar/calendar-client'
import { createEmptyDataset } from '@/lib/empty-dataset'
import { makeCustomer, makeDataset, makeOrder } from '@/test/fixtures'
import type { IntelligenceDataset } from '@/lib/types'

let mockDataset: IntelligenceDataset = createEmptyDataset()
let mockLoading = false

vi.mock('@/components/hooks/use-intelligence-dataset', () => ({
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

  it('can pick a year and month, reset selected day, and return to latest month', () => {
    const januaryOrder = {
      ...makeOrder({ externalOrderId: 'SHP-1', sourceChannel: 'shopee', orderDate: '2026-01-01T00:00:00.000Z', totalAmount: 1000 }),
      id: 'SHP-1',
      customerProfileId: 'repeat-customer',
    }
    const februaryOrder = {
      ...makeOrder({ externalOrderId: 'TT-2', sourceChannel: 'tiktok', orderDate: '2026-02-10T00:00:00.000Z', totalAmount: 2200 }),
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
        firstOrderDate: januaryOrder.orderDate,
        lastOrderDate: februaryOrder.orderDate,
        orders: [januaryOrder, februaryOrder],
      }),
    ])

    render(<CalendarClient />)

    const monthPicker = screen.getByLabelText('Month') as HTMLInputElement
    expect(monthPicker.value).toBe('2026-02')
    expect(screen.getByText('February 2026')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Mar 5, 2026 calendar day' }))
    expect(screen.getByText('Mar 5, 2026')).toBeInTheDocument()

    fireEvent.change(monthPicker, { target: { value: '2026-03' } })
    expect(monthPicker.value).toBe('2026-03')
    expect(screen.getByText('March 2026')).toBeInTheDocument()
    expect(screen.getByText('Mar 12, 2026')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /latest/i }))
    expect(monthPicker.value).toBe('2026-02')
    expect(screen.getByText('February 2026')).toBeInTheDocument()
  })
})

function linkByHref(href: string) {
  return Array.from(document.querySelectorAll('a')).find((link) => link.getAttribute('href') === href)
}
