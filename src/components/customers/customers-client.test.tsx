import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CustomersClient } from '@/components/customers/customers-client'
import { createEmptyDataset } from '@/lib/empty-dataset'
import { downloadCsv } from '@/lib/services/export'
import { makeCustomer, makeDataset } from '@/test/fixtures'
import type { IntelligenceDataset } from '@/lib/types'

let mockDataset: IntelligenceDataset = createEmptyDataset()
let mockLoading = false
let mockSearchParams = new URLSearchParams()
const push = vi.fn()

vi.mock('@/lib/use-intelligence-dataset', () => ({
  useIntelligenceDataset: () => ({
    dataset: mockDataset,
    loading: mockLoading,
  }),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/customers',
  useRouter: () => ({ push }),
  useSearchParams: () => mockSearchParams,
}))

vi.mock('@/lib/services/export', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/export')>()
  return {
    ...actual,
    downloadCsv: vi.fn(),
  }
})

describe('CustomersClient', () => {
  beforeEach(() => {
    mockDataset = createEmptyDataset()
    mockLoading = false
    mockSearchParams = new URLSearchParams()
    push.mockReset()
    vi.mocked(downloadCsv).mockReset()
  })

  it('asks for an import when no customers exist', () => {
    render(<CustomersClient />)

    expect(screen.getByText('No customers yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /import orders/i })).toHaveAttribute('href', '/imports')
  })

  it('shows active filters from the URL and clears them', async () => {
    const user = userEvent.setup()
    mockSearchParams = new URLSearchParams('status=VIP')
    mockDataset = makeDataset([
      makeCustomer({ id: 'vip-customer', fullName: 'Mali Wong', customerStatus: 'VIP' }),
      makeCustomer({ id: 'repeat-customer', fullName: 'Niran Cha', customerStatus: 'Repeat' }),
    ])

    render(<CustomersClient />)

    expect(screen.getByText('Mali Wong')).toBeInTheDocument()
    expect(screen.queryByText('Niran Cha')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^clear$/i }))

    expect(push).toHaveBeenCalledWith('/customers')
  })

  it('exports only filtered customers', async () => {
    const user = userEvent.setup()
    mockSearchParams = new URLSearchParams('status=VIP')
    mockDataset = makeDataset([
      makeCustomer({ id: 'vip-customer', fullName: 'Mali Wong', customerStatus: 'VIP' }),
      makeCustomer({ id: 'repeat-customer', fullName: 'Niran Cha', customerStatus: 'Repeat' }),
    ])

    render(<CustomersClient />)

    await user.click(screen.getByRole('button', { name: /export filtered/i }))

    expect(downloadCsv).toHaveBeenCalledTimes(1)
    expect(vi.mocked(downloadCsv).mock.calls[0][1]).toContain('Mali Wong')
    expect(vi.mocked(downloadCsv).mock.calls[0][1]).not.toContain('Niran Cha')
  })
})
