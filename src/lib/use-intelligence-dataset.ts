'use client'

import { useEffect, useMemo, useState } from 'react'
import { clearCurrentDataset, ensureUserStore, loadCurrentDataset, persistCurrentImport } from '@/app/actions/dataset'
import { createEmptyDataset, defaultVipThreshold } from '@/lib/empty-dataset'
import { allowsLocalDemoMode, hasSupabaseRuntimeConfig } from '@/lib/runtime-config'
import { processOrders } from '@/lib/services/import-pipeline'
import type { IntelligenceDataset, OrderInput, SourceChannel } from '@/lib/types'

const storageKey = 'repeat-customer-intelligence.dataset.v3'
const vipStorageKey = 'repeat-customer-intelligence.vipThreshold'

const hasSupabase = hasSupabaseRuntimeConfig()
const canUseLocalDemo = allowsLocalDemoMode()

type DatasetSessionState = {
  dataset: IntelligenceDataset
  storeId: string | null
  loading: boolean
  localFallback: boolean
}

const subscribers = new Set<(state: DatasetSessionState) => void>()

let sessionState: DatasetSessionState | null = null
let inFlight: Promise<void> | null = null

export function useIntelligenceDataset() {
  const [state, setState] = useState<DatasetSessionState>(() => currentState())

  useEffect(() => {
    const unsubscribe = subscribe(setState)
    ensureRemoteDatasetStarted()

    return unsubscribe
  }, [])

  // localStorage is allowed only for explicit local demo mode, never as production truth.
  useEffect(() => {
    if (state.localFallback && typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, JSON.stringify(state.dataset))
    }
  }, [state.dataset, state.localFallback])

  return useMemo(
    () => ({
      dataset: state.dataset,
      loading: state.loading,
      importOrders: async (orders: OrderInput[], fileName: string, sourceChannel: SourceChannel) => {
        const current = currentState()
        if (!current.storeId && !current.localFallback) {
          console.error('No production workspace is connected. Enable NEXT_PUBLIC_ALLOW_LOCAL_DEMO_MODE=true only for local demos.')
          return
        }

        const newDataset = processOrders(current.dataset, orders, fileName, sourceChannel)

        if (current.storeId) {
          try {
            await persistCurrentImport(newDataset)
            updateSessionState((state) => ({ ...state, dataset: newDataset }))
          } catch (error) {
            console.error('Failed to persist production dataset. Keeping database as source of truth.', error)
          }
          return
        }

        updateSessionState((state) => ({ ...state, dataset: newDataset }))
      },
      clearDataset: async () => {
        const current = currentState()
        if (current.storeId) {
          try {
            await clearCurrentDataset()
            updateSessionState((state) => ({ ...state, dataset: createEmptyDataset(current.dataset.vipThreshold) }))
          } catch (error) {
            console.error('Failed to clear production dataset. Keeping database as source of truth.', error)
          }
          return
        }

        if (current.localFallback) {
          window.localStorage.removeItem(storageKey)
          updateSessionState((state) => ({ ...state, dataset: createEmptyDataset(current.dataset.vipThreshold) }))
        }
      },
      updateVipThreshold: (vipThreshold: number) => {
        if (typeof window !== 'undefined' && canUseLocalDemo) {
          window.localStorage.setItem(vipStorageKey, String(vipThreshold))
        }
        updateSessionState((current) => ({
          ...current,
          dataset: { ...current.dataset, vipThreshold },
        }))
      },
    }),
    [state.dataset, state.loading],
  )
}

function subscribe(listener: (state: DatasetSessionState) => void) {
  subscribers.add(listener)
  listener(currentState())

  return () => {
    subscribers.delete(listener)
  }
}

function currentState() {
  if (!sessionState) {
    sessionState = {
      dataset: canUseLocalDemo && !hasSupabase && typeof window !== 'undefined' ? loadSavedDataset() : createEmptyDataset(),
      storeId: null,
      loading: hasSupabase,
      localFallback: canUseLocalDemo && !hasSupabase,
    }
  }

  return sessionState
}

function updateSessionState(updater: (current: DatasetSessionState) => DatasetSessionState) {
  sessionState = updater(currentState())
  subscribers.forEach((listener) => listener(sessionState!))
}

function ensureRemoteDatasetStarted() {
  if (!hasSupabase || inFlight || !currentState().loading) return

  inFlight = loadRemoteDataset().finally(() => {
    inFlight = null
  })
}

async function loadRemoteDataset() {
  try {
    const storeId = await ensureUserStore()
    const dbData = await loadCurrentDataset()
    const vipThreshold = savedVipThreshold()
    const hasStoredData = dbData.customers.length > 0 || dbData.orders.length > 0 || dbData.imports.length > 0

    updateSessionState((current) => ({
      ...current,
      dataset: hasStoredData ? { ...dbData, vipThreshold } : createEmptyDataset(vipThreshold),
      storeId,
      loading: false,
      localFallback: false,
    }))
  } catch (error) {
    console.error('Failed to load production dataset.', error)
    updateSessionState((current) => ({
      ...current,
      dataset: canUseLocalDemo ? loadSavedDataset() : createEmptyDataset(),
      storeId: null,
      loading: false,
      localFallback: canUseLocalDemo,
    }))
  }
}

function savedVipThreshold() {
  if (typeof window === 'undefined') return defaultVipThreshold

  const saved = canUseLocalDemo ? window.localStorage.getItem(vipStorageKey) : null
  const parsed = saved ? Number(saved) : defaultVipThreshold

  return Number.isFinite(parsed) ? parsed : defaultVipThreshold
}

function loadSavedDataset() {
  if (typeof window === 'undefined') return createEmptyDataset()

  const stored = window.localStorage.getItem(storageKey)
  if (!stored) return createEmptyDataset(savedVipThreshold())

  try {
    return JSON.parse(stored) as IntelligenceDataset
  } catch {
    return createEmptyDataset(savedVipThreshold())
  }
}
