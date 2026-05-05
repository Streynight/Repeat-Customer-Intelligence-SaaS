import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsClient } from '@/components/settings-client'
import { makeCustomer, makeDataset, makeOrder } from '@/test/fixtures'
import type { DatasetSource } from '@/components/hooks/use-intelligence-dataset'
import type { IntelligenceDataset } from '@/lib/types'

let mockDataset: IntelligenceDataset = makeDataset([])
let mockLoading = false
let mockDataSource: DatasetSource = 'production'
const updateVipThreshold = vi.fn()
const clearDataset = vi.fn()

vi.mock('@/components/hooks/use-intelligence-dataset', () => ({
  useIntelligenceDataset: () => ({
    dataset: mockDataset,
    loading: mockLoading,
    dataSource: mockDataSource,
    updateVipThreshold,
    clearDataset,
  }),
}))

describe('SettingsClient', () => {
  beforeEach(() => {
    mockDataset = settingsDataset()
    mockLoading = false
    mockDataSource = 'production'
    updateVipThreshold.mockReset()
    clearDataset.mockReset()
  })

  it('shows workspace status and concrete next-step links', () => {
    render(<SettingsClient />)

    expect(screen.getByText('Workspace status')).toBeInTheDocument()
    expect(screen.getByText('Production workspace')).toBeInTheDocument()
    expect(screen.getByText('Recommended next action')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /review win-back queue/i })[0]).toHaveAttribute('href', '/customers?segment=winback&sort=lastOrder')
    expect(screen.getByRole('link', { name: /check vat and income/i })).toHaveAttribute('href', '/income')
  })

  it('validates and applies VIP thresholds explicitly', async () => {
    const user = userEvent.setup()
    render(<SettingsClient />)

    await user.click(screen.getByRole('tab', { name: 'Rules' }))
    const input = screen.getByLabelText('VIP spend threshold')

    await user.clear(input)
    await user.type(input, '-1')
    await user.click(screen.getByRole('button', { name: 'Apply threshold' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a VIP spend threshold of 0 or more.')
    expect(updateVipThreshold).not.toHaveBeenCalled()

    await user.clear(input)
    await user.type(input, '5000')
    await user.click(screen.getByRole('button', { name: 'Apply threshold' }))

    expect(updateVipThreshold).toHaveBeenCalledWith(5000)
  })
})

function settingsDataset() {
  const repeatOrder = {
    ...makeOrder({ externalOrderId: 'VIP-2', sourceChannel: 'website', orderDate: '2099-05-02T00:00:00.000Z', totalAmount: 2800 }),
    id: 'vip-2',
    customerProfileId: 'vip-customer',
  }
  const atRiskOrder = {
    ...makeOrder({ externalOrderId: 'RISK-1', sourceChannel: 'tiktok', orderDate: '2026-01-01T00:00:00.000Z', totalAmount: 1200 }),
    id: 'risk-1',
    customerProfileId: 'risk-customer',
  }

  const dataset = makeDataset([
    makeCustomer({
      id: 'vip-customer',
      fullName: 'Mali Wong',
      customerStatus: 'VIP',
      totalOrders: 3,
      totalSpent: 7200,
      firstChannel: 'shopee',
      lastChannel: 'website',
      lastOrderDate: repeatOrder.orderDate,
      orders: [
        {
          ...makeOrder({ externalOrderId: 'VIP-1', sourceChannel: 'shopee', orderDate: '2099-05-01T00:00:00.000Z', totalAmount: 4400 }),
          id: 'vip-1',
          customerProfileId: 'vip-customer',
        },
        repeatOrder,
      ],
    }),
    makeCustomer({
      id: 'risk-customer',
      fullName: 'Nok Store',
      email: 'nok@example.com',
      customerStatus: 'AtRisk',
      totalOrders: 1,
      totalSpent: 1200,
      firstChannel: 'tiktok',
      lastChannel: 'tiktok',
      firstOrderDate: atRiskOrder.orderDate,
      lastOrderDate: atRiskOrder.orderDate,
      orders: [atRiskOrder],
    }),
  ])

  return {
    ...dataset,
    imports: [{
      id: 'import-1',
      fileName: 'orders.csv',
      sourceChannel: 'csv',
      importStatus: 'completed',
      totalRows: 3,
      importedRows: 3,
      createdAt: '2026-05-04T00:00:00.000Z',
    }],
    vipThreshold: 6500,
  } satisfies IntelligenceDataset
}
