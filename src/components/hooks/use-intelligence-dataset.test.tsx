import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearWorkspaceConfirmationText } from '@/lib/data-safety'
import { makeDataset, makeOrder } from '@/test/fixtures'
import type { IntelligenceDataset, OrderInput, SourceChannel } from '@/lib/types'

type UseDatasetResult = {
  dataset: IntelligenceDataset
  loading: boolean
  importOrders: (orders: OrderInput[], fileName: string, sourceChannel: SourceChannel) => Promise<void>
  clearDataset: (confirmation: string) => Promise<void>
  updateVipThreshold: (vipThreshold: number) => void
}

function Probe({ label = 'probe', useDataset }: { label?: string; useDataset: () => UseDatasetResult }) {
  const { dataset, loading } = useDataset()

  return (
    <div data-testid={label}>
      {loading ? 'loading' : 'ready'}:{dataset.customers.length}:{dataset.orders.length}:{dataset.imports.length}:{dataset.vipThreshold}
    </div>
  )
}

function ActionsProbe({ useDataset }: { useDataset: () => UseDatasetResult }) {
  const { clearDataset, importOrders, updateVipThreshold } = useDataset()

  return (
    <div>
      <button
        type="button"
        onClick={() => void importOrders([makeOrder({ externalOrderId: 'LOCAL-1' })], 'orders.csv', 'shopee')}
      >
        import
      </button>
      <button type="button" onClick={() => updateVipThreshold(9000)}>
        vip
      </button>
      <button type="button" onClick={() => void clearDataset(clearWorkspaceConfirmationText)}>
        clear
      </button>
    </div>
  )
}

describe('useIntelligenceDataset clean workspace defaults', () => {
  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    window.localStorage?.clear?.()
  })

  it('starts local fallback workspaces empty when no saved dataset exists', async () => {
    installLocalStorageMock()
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_ALLOW_LOCAL_DEMO_MODE', 'true')
    vi.doMock('@/app/actions/dataset', () => ({
      clearCurrentDataset: vi.fn(),
      ensureUserStore: vi.fn(),
      importCurrentOrders: vi.fn(),
      loadCurrentDataset: vi.fn(),
    }))
    vi.doMock('@/lib/supabase/client', () => ({
      createClient: vi.fn(),
    }))

    const { useIntelligenceDataset } = await import('@/components/hooks/use-intelligence-dataset')

    render(<Probe useDataset={useIntelligenceDataset} />)

    expect(screen.getByText('ready:0:0:0:6500')).toBeInTheDocument()
  })

  it('does not replace an empty Supabase store with demo data', async () => {
    installLocalStorageMock()
    const ensureUserStore = vi.fn().mockResolvedValue('store-1')
    const loadCurrentDataset = vi.fn().mockResolvedValue({
      customers: [],
      orders: [],
      imports: [],
    })

    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://repeat-tree.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    vi.doMock('@/app/actions/dataset', () => ({
      clearCurrentDataset: vi.fn(),
      ensureUserStore,
      importCurrentOrders: vi.fn(),
      loadCurrentDataset,
    }))
    vi.doMock('@/lib/supabase/client', () => ({
      createClient: () => ({
        auth: {
          getUser: () => Promise.resolve({ data: { user: { id: 'user-1', email: 'owner@store.com' } } }),
        },
      }),
    }))

    const { useIntelligenceDataset } = await import('@/components/hooks/use-intelligence-dataset')

    render(<Probe useDataset={useIntelligenceDataset} />)

    await waitFor(() => expect(screen.getByText('ready:0:0:0:6500')).toBeInTheDocument())
    expect(ensureUserStore).toHaveBeenCalledWith()
    expect(loadCurrentDataset).toHaveBeenCalledWith()
  })

  it('loads the Supabase dataset once and reuses it for later hook instances', async () => {
    installLocalStorageMock()
    const ensureUserStore = vi.fn().mockResolvedValue('store-1')
    const loadCurrentDataset = vi.fn().mockResolvedValue({
      customers: makeDataset().customers,
      orders: makeDataset().orders,
      imports: [],
    })

    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://repeat-tree.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    vi.doMock('@/app/actions/dataset', () => ({
      clearCurrentDataset: vi.fn(),
      ensureUserStore,
      importCurrentOrders: vi.fn(),
      loadCurrentDataset,
    }))
    vi.doMock('@/lib/supabase/client', () => ({
      createClient: () => ({
        auth: {
          getUser: () => Promise.resolve({ data: { user: { id: 'user-1', email: 'owner@store.com' } } }),
        },
      }),
    }))

    const { useIntelligenceDataset } = await import('@/components/hooks/use-intelligence-dataset')
    const { rerender } = render(<Probe label="first" useDataset={useIntelligenceDataset} />)

    await waitFor(() => expect(screen.getByTestId('first')).toHaveTextContent('ready:1:1:0:6500'))

    rerender(
      <>
        <Probe label="first" useDataset={useIntelligenceDataset} />
        <Probe label="second" useDataset={useIntelligenceDataset} />
      </>,
    )

    expect(screen.getByTestId('second')).toHaveTextContent('ready:1:1:0:6500')
    expect(ensureUserStore).toHaveBeenCalledTimes(1)
    expect(loadCurrentDataset).toHaveBeenCalledTimes(1)
  })

  it('shares import, clear, and VIP updates across hook subscribers in one session', async () => {
    installLocalStorageMock()
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_ALLOW_LOCAL_DEMO_MODE', 'true')
    vi.doMock('@/app/actions/dataset', () => ({
      clearCurrentDataset: vi.fn(),
      ensureUserStore: vi.fn(),
      importCurrentOrders: vi.fn(),
      loadCurrentDataset: vi.fn(),
    }))
    vi.doMock('@/lib/supabase/client', () => ({
      createClient: vi.fn(),
    }))

    const { useIntelligenceDataset } = await import('@/components/hooks/use-intelligence-dataset')

    render(
      <>
        <Probe label="first" useDataset={useIntelligenceDataset} />
        <ActionsProbe useDataset={useIntelligenceDataset} />
      </>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'import' }))
    await waitFor(() => expect(screen.getByTestId('first')).toHaveTextContent('ready:1:1:1:6500'))

    render(<Probe label="second" useDataset={useIntelligenceDataset} />)
    expect(screen.getByTestId('second')).toHaveTextContent('ready:1:1:1:6500')

    fireEvent.click(screen.getByRole('button', { name: 'vip' }))
    await waitFor(() => expect(screen.getByTestId('first')).toHaveTextContent('ready:1:1:1:9000'))
    expect(screen.getByTestId('second')).toHaveTextContent('ready:1:1:1:9000')

    fireEvent.click(screen.getByRole('button', { name: 'clear' }))
    await waitFor(() => expect(screen.getByTestId('first')).toHaveTextContent('ready:0:0:0:9000'))
    expect(screen.getByTestId('second')).toHaveTextContent('ready:0:0:0:9000')
  })

  it('imports production orders through a server-owned command instead of sending a full dataset', async () => {
    installLocalStorageMock()
    const ensureUserStore = vi.fn().mockResolvedValue('store-1')
    const loadCurrentDataset = vi.fn().mockResolvedValue({
      customers: [],
      orders: [],
      imports: [],
    })
    const importedDataset = makeDataset()
    const importCurrentOrders = vi.fn().mockResolvedValue({
      customers: importedDataset.customers,
      orders: importedDataset.orders,
      imports: [{
        id: 'server-import-1',
        fileName: 'orders.csv',
        sourceChannel: 'shopee',
        importStatus: 'completed',
        totalRows: 1,
        importedRows: 1,
        createdAt: '2026-05-03T00:00:00.000Z',
      }],
    })

    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://repeat-tree.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    vi.doMock('@/app/actions/dataset', () => ({
      clearCurrentDataset: vi.fn(),
      ensureUserStore,
      importCurrentOrders,
      loadCurrentDataset,
    }))
    vi.doMock('@/lib/supabase/client', () => ({
      createClient: () => ({
        auth: {
          getUser: () => Promise.resolve({ data: { user: { id: 'user-1', email: 'owner@store.com' } } }),
        },
      }),
    }))

    const { useIntelligenceDataset } = await import('@/components/hooks/use-intelligence-dataset')

    render(
      <>
        <Probe label="first" useDataset={useIntelligenceDataset} />
        <ActionsProbe useDataset={useIntelligenceDataset} />
      </>,
    )

    await waitFor(() => expect(screen.getByTestId('first')).toHaveTextContent('ready:0:0:0:6500'))
    fireEvent.click(screen.getByRole('button', { name: 'import' }))

    await waitFor(() => expect(importCurrentOrders).toHaveBeenCalledTimes(1))
    expect(importCurrentOrders.mock.calls[0][0]).toMatchObject({
      fileName: 'orders.csv',
      sourceChannel: 'shopee',
      vipThreshold: 6500,
      orders: [expect.objectContaining({ externalOrderId: 'LOCAL-1' })],
    })
    expect(importCurrentOrders.mock.calls[0][0]).not.toHaveProperty('customers')
    await waitFor(() => expect(screen.getByTestId('first')).toHaveTextContent('ready:1:1:1:6500'))
  })

  it('clears production data only through an explicit confirmation command', async () => {
    installLocalStorageMock()
    const ensureUserStore = vi.fn().mockResolvedValue('store-1')
    const loadedDataset = makeDataset()
    const loadCurrentDataset = vi.fn().mockResolvedValue({
      customers: loadedDataset.customers,
      orders: loadedDataset.orders,
      imports: [],
    })
    const clearCurrentDataset = vi.fn().mockResolvedValue(undefined)

    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://repeat-tree.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    vi.doMock('@/app/actions/dataset', () => ({
      clearCurrentDataset,
      ensureUserStore,
      importCurrentOrders: vi.fn(),
      loadCurrentDataset,
    }))
    vi.doMock('@/lib/supabase/client', () => ({
      createClient: () => ({
        auth: {
          getUser: () => Promise.resolve({ data: { user: { id: 'user-1', email: 'owner@store.com' } } }),
        },
      }),
    }))

    const { useIntelligenceDataset } = await import('@/components/hooks/use-intelligence-dataset')

    render(
      <>
        <Probe label="first" useDataset={useIntelligenceDataset} />
        <ActionsProbe useDataset={useIntelligenceDataset} />
      </>,
    )

    await waitFor(() => expect(screen.getByTestId('first')).toHaveTextContent('ready:1:1:0:6500'))
    fireEvent.click(screen.getByRole('button', { name: 'clear' }))

    await waitFor(() => expect(clearCurrentDataset).toHaveBeenCalledTimes(1))
    expect(clearCurrentDataset).toHaveBeenCalledWith({ confirmation: clearWorkspaceConfirmationText })
    await waitFor(() => expect(screen.getByTestId('first')).toHaveTextContent('ready:0:0:0:6500'))
  })

  it('falls back to an empty local workspace when Supabase data loading fails', async () => {
    installLocalStorageMock()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const ensureUserStore = vi.fn().mockRejectedValue(new Error('database unavailable'))

    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://repeat-tree.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    vi.doMock('@/app/actions/dataset', () => ({
      clearCurrentDataset: vi.fn(),
      ensureUserStore,
      importCurrentOrders: vi.fn(),
      loadCurrentDataset: vi.fn(),
    }))
    vi.doMock('@/lib/supabase/client', () => ({
      createClient: () => ({
        auth: {
          getUser: () => Promise.resolve({ data: { user: { id: 'user-1', email: 'owner@store.com' } } }),
        },
      }),
    }))

    const { useIntelligenceDataset } = await import('@/components/hooks/use-intelligence-dataset')

    render(<Probe useDataset={useIntelligenceDataset} />)

    await waitFor(() => expect(screen.getByText('ready:0:0:0:6500')).toBeInTheDocument())
    expect(ensureUserStore).toHaveBeenCalledWith()
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to load production dataset.',
      expect.any(Error),
    )
    consoleError.mockRestore()
  })
})

function installLocalStorageMock() {
  const store = new Map<string, string>()

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => store.set(key, value)),
      removeItem: vi.fn((key: string) => store.delete(key)),
      clear: vi.fn(() => store.clear()),
    },
  })
}
