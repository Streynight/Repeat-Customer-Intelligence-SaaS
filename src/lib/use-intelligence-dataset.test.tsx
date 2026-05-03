import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { IntelligenceDataset } from '@/lib/types'

function Probe({ useDataset }: { useDataset: () => { dataset: IntelligenceDataset; loading: boolean } }) {
  const { dataset, loading } = useDataset()

  return (
    <div>
      {loading ? 'loading' : 'ready'}:{dataset.customers.length}:{dataset.orders.length}:{dataset.imports.length}
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
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.doMock('@/app/actions/dataset', () => ({
      clearStoreDataset: vi.fn(),
      ensureUserStore: vi.fn(),
      loadDataset: vi.fn(),
      persistImport: vi.fn(),
    }))
    vi.doMock('@/lib/supabase/client', () => ({
      createClient: vi.fn(),
    }))

    const { useIntelligenceDataset } = await import('@/lib/use-intelligence-dataset')

    render(<Probe useDataset={useIntelligenceDataset} />)

    expect(screen.getByText('ready:0:0:0')).toBeInTheDocument()
  })

  it('does not replace an empty Supabase store with demo data', async () => {
    installLocalStorageMock()
    const ensureUserStore = vi.fn().mockResolvedValue('store-1')
    const loadDataset = vi.fn().mockResolvedValue({
      customers: [],
      orders: [],
      imports: [],
    })

    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://repeat-tree.supabase.co')
    vi.doMock('@/app/actions/dataset', () => ({
      clearStoreDataset: vi.fn(),
      ensureUserStore,
      loadDataset,
      persistImport: vi.fn(),
    }))
    vi.doMock('@/lib/supabase/client', () => ({
      createClient: () => ({
        auth: {
          getUser: () => Promise.resolve({ data: { user: { id: 'user-1', email: 'owner@store.com' } } }),
        },
      }),
    }))

    const { useIntelligenceDataset } = await import('@/lib/use-intelligence-dataset')

    render(<Probe useDataset={useIntelligenceDataset} />)

    await waitFor(() => expect(screen.getByText('ready:0:0:0')).toBeInTheDocument())
    expect(ensureUserStore).toHaveBeenCalledWith('user-1', 'owner@store.com')
    expect(loadDataset).toHaveBeenCalledWith('store-1')
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
