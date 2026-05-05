import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ImportClient } from '@/components/imports/import-client'
import { defaultMapping } from '@/lib/services/import-pipeline'
import { makeDataset } from '@/test/fixtures'

const importOrders = vi.fn()
let mockDataset = makeDataset()

vi.mock('@/components/hooks/use-intelligence-dataset', () => ({
  useIntelligenceDataset: () => ({
    dataset: mockDataset,
    importOrders,
    loading: false,
  }),
}))

describe('ImportClient', () => {
  beforeEach(() => {
    importOrders.mockReset()
    mockDataset = makeDataset()
  })

  it('loads a sample CSV and shows diagnostics plus preview rows', async () => {
    const user = userEvent.setup()
    render(<ImportClient />)

    await user.click(screen.getAllByRole('button', { name: /try sample/i })[0])

    expect(screen.getByText('Pre-import diagnostics')).toBeInTheDocument()
    expect(screen.getByText('Importable')).toBeInTheDocument()
    expect(screen.getByText('Import preview')).toBeInTheDocument()
    expect(screen.getByText('Valid rows')).toBeInTheDocument()
  })

  it('offers marketplace source presets including Lazada', () => {
    render(<ImportClient />)

    expect(screen.getByRole('combobox', { name: 'Import source' })).toHaveTextContent('Shopee')
    expect(screen.getByText('Lazada sample')).toBeInTheDocument()
  })

  it('shows a clean empty import history before any import', () => {
    mockDataset = makeDataset([])
    render(<ImportClient />)

    expect(screen.getByText('No imports yet. Connect a native integration or upload a fallback CSV.')).toBeInTheDocument()
  })

  it('imports sample rows when diagnostics are importable', async () => {
    const user = userEvent.setup()
    render(<ImportClient />)

    await user.click(screen.getAllByRole('button', { name: /try sample/i })[0])
    await user.click(screen.getByRole('button', { name: /confirm import/i }))

    expect(importOrders).toHaveBeenCalledTimes(1)
    expect(importOrders.mock.calls[0][0].length).toBeGreaterThan(0)
  })

  it('accepts PDF only as a preview warning and does not parse it as orders', async () => {
    const user = userEvent.setup()
    render(<ImportClient />)

    const file = new File(['%PDF-1.4'], 'orders.pdf', { type: 'application/pdf' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(input, file)

    expect(
      screen.getAllByText('PDF preview only. Upload CSV or XLSX order data for repeat-customer analysis.'),
    ).not.toHaveLength(0)
    expect(screen.queryByText('Import preview')).not.toBeInTheDocument()
    expect(importOrders).not.toHaveBeenCalled()
  })

  it('disables confirm import when required mappings are missing', async () => {
    const user = userEvent.setup()
    render(<ImportClient />)

    await user.click(screen.getAllByRole('button', { name: /try sample/i })[0])
    const totalAmountSelect = screen.getByLabelText('totalAmount')
    await user.selectOptions(totalAmountSelect, '')

    expect(screen.getByText('Blocked')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm import/i })).toBeDisabled()
    expect(importOrders).not.toHaveBeenCalled()
  })

  it('shows warnings without blocking import', async () => {
    const user = userEvent.setup()
    render(<ImportClient />)

    const csv = [
      'order_id,customer_name,email,phone,line_id,province,order_date,total_amount,product_name,quantity,unit_price',
      'WARN-1,No Contact Buyer,,,,Bangkok,2026-04-01,1200,Serum,1,1200',
    ].join('\n')
    const file = new File([csv], 'warnings.csv', { type: 'text/csv' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(input, file)

    expect(screen.getByText('Importable')).toBeInTheDocument()
    expect(screen.getByText(/Missing phone and email; fuzzy name matching may be used/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm import/i })).toBeEnabled()
  })

  it('shows likely merge details for sample rows matching existing customers', async () => {
    const user = userEvent.setup()
    mockDataset = makeDataset()
    render(<ImportClient />)

    await user.click(screen.getAllByRole('button', { name: /try sample/i })[0])

    const mergePanel = screen.getByText('Likely merges').closest('div')?.parentElement
    expect(mergePanel).toBeTruthy()
    expect(within(mergePanel as HTMLElement).getByText('Phone exact')).toBeInTheDocument()
  })
})

describe('defaultMapping test fixture', () => {
  it('keeps the expected required mapping labels available to accessible selects', () => {
    expect(defaultMapping.totalAmount).toBe('total_amount')
  })
})
