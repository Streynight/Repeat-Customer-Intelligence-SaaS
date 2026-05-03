import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createCsvSyncConnection, testCsvSyncConnectionUrl } from '@/app/actions/finance'
import { IncomeClient } from '@/components/income/income-client'
import { createEmptyDataset } from '@/lib/empty-dataset'
import { downloadCsv } from '@/lib/services/export'
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

vi.mock('@/app/actions/finance', () => ({
  loadFinanceWorkspace: vi.fn().mockResolvedValue({
    settings: { taxCountry: 'TH', taxLabel: 'VAT', taxRate: 0.07, taxIncluded: true },
    connections: [],
    runs: [],
  }),
  saveFinanceSettings: vi.fn().mockResolvedValue(undefined),
  testCsvSyncConnectionUrl: vi.fn().mockResolvedValue({ totalRows: 1, importableRows: 1, errors: [], canImport: true }),
  createCsvSyncConnection: vi.fn().mockResolvedValue({
    id: 'sync-1',
    name: 'Shopee sync',
    csvUrl: 'https://example.com/orders.csv',
    sourceChannel: 'shopee',
    columnMapping: {},
    enabled: true,
    intervalMinutes: 60,
    createdAt: '2026-05-01T00:00:00.000Z',
  }),
  updateCsvSyncConnection: vi.fn(),
  deleteCsvSyncConnection: vi.fn(),
  runCsvSyncNow: vi.fn(),
}))

vi.mock('@/lib/services/export', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/export')>()
  return {
    ...actual,
    downloadCsv: vi.fn(),
  }
})

describe('IncomeClient', () => {
  beforeEach(() => {
    mockDataset = createEmptyDataset()
    mockLoading = false
    mockSearchParams = new URLSearchParams()
    push.mockReset()
    vi.mocked(createCsvSyncConnection).mockClear()
    vi.mocked(testCsvSyncConnectionUrl).mockClear()
    vi.mocked(downloadCsv).mockReset()
  })

  it('renders an empty state for a new workspace', async () => {
    render(<IncomeClient />)

    expect(await screen.findByText('Income appears after the first import')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /import orders/i })).toHaveAttribute('href', '/imports')
    expect(screen.getByRole('link', { name: /add csv sync/i })).toHaveAttribute('href', '/income?tab=sync')
  })

  it('shows VAT summary and exports VAT CSV', async () => {
    const user = userEvent.setup()
    mockSearchParams = new URLSearchParams('tab=vat')
    mockDataset = makeDataset([
      makeCustomer({
        orders: [
          {
            ...makeOrder({ externalOrderId: 'ORDER-1', totalAmount: 1070 }),
            id: 'ORDER-1',
            customerProfileId: 'customer-1',
          },
        ],
      }),
    ])

    render(<IncomeClient />)

    expect(await screen.findByText('Monthly VAT summary')).toBeInTheDocument()
    expect(screen.getByText('Estimated')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /export vat csv/i }))
    expect(downloadCsv).toHaveBeenCalledWith('vat-summary.csv', expect.stringContaining('estimated_tax'))
  })

  it('creates CSV sync connections from the sync tab', async () => {
    const user = userEvent.setup()
    mockSearchParams = new URLSearchParams('tab=sync')

    render(<IncomeClient />)

    expect(await screen.findByText('CSV scheduled sync')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Connection name'), 'Shopee sync')
    await user.type(screen.getByLabelText('CSV URL'), 'https://example.com/orders.csv')
    await user.click(screen.getByRole('button', { name: /test and save sync/i }))

    await waitFor(() => {
      expect(testCsvSyncConnectionUrl).toHaveBeenCalledWith({
        name: 'Shopee sync',
        csvUrl: 'https://example.com/orders.csv',
        sourceChannel: 'shopee',
      })
    })
    await waitFor(() => {
      expect(createCsvSyncConnection).toHaveBeenCalledWith({
        name: 'Shopee sync',
        csvUrl: 'https://example.com/orders.csv',
        sourceChannel: 'shopee',
      })
    })
    expect(await screen.findByText(/connected 1 importable rows/i)).toBeInTheDocument()
    expect(screen.getByText('Shopee sync')).toBeInTheDocument()
  })
})
