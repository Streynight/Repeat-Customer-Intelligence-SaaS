import type { IntelligenceDataset } from '@/lib/types'

export const defaultVipThreshold = 6500

export function createEmptyDataset(vipThreshold = defaultVipThreshold): IntelligenceDataset {
  return {
    customers: [],
    orders: [],
    imports: [],
    vipThreshold,
  }
}
