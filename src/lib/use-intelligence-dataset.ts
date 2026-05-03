'use client'

import { useEffect, useMemo, useState } from 'react'
import { processOrders } from '@/lib/services/import-pipeline'
import { createClient } from '@/lib/supabase/client'
import { clearStoreDataset, ensureUserStore, loadDataset, persistImport } from '@/app/actions/dataset'
import { createEmptyDataset, defaultVipThreshold } from '@/lib/empty-dataset'
import type { IntelligenceDataset, OrderInput, SourceChannel } from '@/lib/types'

const storageKey = 'repeat-customer-intelligence.dataset.v3'
const vipStorageKey = 'repeat-customer-intelligence.vipThreshold'

const hasSupabase =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('example.supabase.co')

export function useIntelligenceDataset() {
  const [dataset, setDataset] = useState<IntelligenceDataset>(() => {
    if (hasSupabase || typeof window === 'undefined') return createEmptyDataset()

    const stored = window.localStorage.getItem(storageKey)
    if (!stored) return createEmptyDataset(savedVipThreshold())

    try {
      return JSON.parse(stored) as IntelligenceDataset
    } catch {
      return createEmptyDataset(savedVipThreshold())
    }
  })
  const [storeId, setStoreId] = useState<string | null>(null)
  const [loading, setLoading] = useState(hasSupabase)

  useEffect(() => {
    if (!hasSupabase) {
      return
    }

    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setLoading(false)
        return
      }
      try {
        const sid = await ensureUserStore(data.user.id, data.user.email ?? '')
        setStoreId(sid)
        const dbData = await loadDataset(sid)
        const vipThreshold = savedVipThreshold()
        const hasStoredData = dbData.customers.length > 0 || dbData.orders.length > 0 || dbData.imports.length > 0
        setDataset(hasStoredData ? { ...dbData, vipThreshold } : createEmptyDataset(vipThreshold))
      } finally {
        setLoading(false)
      }
    })
  }, [])

  // localStorage fallback sync (demo mode only)
  useEffect(() => {
    if (!hasSupabase) {
      window.localStorage.setItem(storageKey, JSON.stringify(dataset))
    }
  }, [dataset])

  return useMemo(
    () => ({
      dataset,
      loading,
      importOrders: async (orders: OrderInput[], fileName: string, sourceChannel: SourceChannel) => {
        const newDataset = processOrders(dataset, orders, fileName, sourceChannel)
        setDataset(newDataset)
        if (storeId) {
          await persistImport(storeId, newDataset)
        }
      },
      clearDataset: async () => {
        if (storeId) {
          await clearStoreDataset(storeId)
        } else {
          window.localStorage.removeItem(storageKey)
        }

        setDataset(createEmptyDataset(dataset.vipThreshold))
      },
      updateVipThreshold: (vipThreshold: number) => {
        window.localStorage.setItem(vipStorageKey, String(vipThreshold))
        setDataset((current) => ({ ...current, vipThreshold }))
      },
    }),
    [dataset, storeId, loading],
  )
}

function savedVipThreshold() {
  const saved = window.localStorage.getItem(vipStorageKey)
  const parsed = saved ? Number(saved) : defaultVipThreshold

  return Number.isFinite(parsed) ? parsed : defaultVipThreshold
}
