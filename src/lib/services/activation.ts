import { dashboardMetrics } from '@/lib/services/attribution'
import { buildCustomersHref } from '@/lib/services/customer-filters'
import type { IntelligenceDataset, SourceChannel } from '@/lib/types'

export type ActivationStepId = 'import' | 'identity' | 'repeat' | 'winback' | 'sync'

export type ActivationStepState = {
  id: ActivationStepId
  title: string
  detail: string
  href: string
  cta: string
  done: boolean
}

export type ActivationNextAction = {
  title: string
  detail: string
  href: string
  cta: string
}

export type ActivationState = {
  steps: ActivationStepState[]
  nextAction: ActivationNextAction
  completedSteps: number
  progress: number
  contactsWithIdentity: number
  repeatCustomers: number
  repeatRate: number
  repeatRevenue: number
  atRiskCustomerCount: number
  atRiskValue: number
  totalCustomers: number
}

export const activationMigrationSources: Array<{
  channel: SourceChannel
  detail: string
}> = [
  { channel: 'shopee', detail: 'Export paid orders with customer name, phone, order date, amount, and product columns.' },
  { channel: 'tiktok', detail: 'Export recent and historical shop orders so second purchases are visible.' },
  { channel: 'instagram', detail: 'Upload social order sheets with phone, LINE ID, or email for identity matching.' },
  { channel: 'facebook', detail: 'Bring page or inbox order logs into one buyer profile instead of scattered chats.' },
  { channel: 'website', detail: 'Import ecommerce orders to compare owned-channel repeat revenue against marketplaces.' },
  { channel: 'csv', detail: 'Use any clean CSV as long as order ID, customer, date, and amount are mapped.' },
]

export function buildActivationState(
  dataset: IntelligenceDataset,
  options: { csvSyncConnectionCount?: number } = {},
): ActivationState {
  const metrics = dashboardMetrics(dataset)
  const hasImport = dataset.imports.length > 0 || dataset.orders.length > 0
  const contactsWithIdentity = dataset.customers.filter((customer) => customer.email || customer.phone || customer.lineId).length
  const hasCustomerIdentity = contactsWithIdentity > 0
  const hasRepeatCustomers = metrics.repeatCustomers > 0
  const atRiskCustomers = dataset.customers.filter((customer) => customer.customerStatus === 'AtRisk' || customer.customerStatus === 'Lost')
  const hasWinbackQueue = atRiskCustomers.length > 0
  const hasSyncSetup = (options.csvSyncConnectionCount ?? 0) > 0

  const steps: ActivationStepState[] = [
    {
      id: 'import',
      title: 'Bring historical orders',
      detail: 'Start with one real export from the channel customers already buy from.',
      href: '/imports',
      cta: 'Import CSV',
      done: hasImport,
    },
    {
      id: 'identity',
      title: 'Resolve buyer identity',
      detail: 'Phone, email, LINE ID, and names merge scattered orders into customer profiles.',
      href: buildCustomersHref(),
      cta: 'Review buyers',
      done: hasCustomerIdentity,
    },
    {
      id: 'repeat',
      title: 'Find repeat revenue',
      detail: 'Detect which buyers, products, and channels already create second purchases.',
      href: buildCustomersHref({ segment: 'repeat', sort: 'repeatRevenue' }),
      cta: 'Open repeat list',
      done: hasRepeatCustomers,
    },
    {
      id: 'winback',
      title: 'Build the win-back queue',
      detail: 'Turn stale buyers into a focused follow-up list before they are fully lost.',
      href: buildCustomersHref({ segment: 'winback', sort: 'lastOrder' }),
      cta: 'Open queue',
      done: hasWinbackQueue,
    },
    {
      id: 'sync',
      title: 'Automate recurring sync',
      detail: 'After the first import works, schedule a CSV sync so reporting stays current.',
      href: '/income?tab=sync',
      cta: 'Set sync',
      done: hasSyncSetup,
    },
  ]
  const completedSteps = steps.filter((step) => step.done).length

  return {
    steps,
    nextAction: getNextAction({
      hasImport,
      hasRepeatCustomers,
      hasWinbackQueue,
      hasSyncSetup,
    }),
    completedSteps,
    progress: Math.round((completedSteps / steps.length) * 100),
    contactsWithIdentity,
    repeatCustomers: metrics.repeatCustomers,
    repeatRate: metrics.repeatRate,
    repeatRevenue: metrics.repeatRevenue,
    atRiskCustomerCount: atRiskCustomers.length,
    atRiskValue: atRiskCustomers.reduce((sum, customer) => sum + customer.totalSpent, 0),
    totalCustomers: metrics.totalCustomers,
  }
}

function getNextAction({
  hasImport,
  hasRepeatCustomers,
  hasWinbackQueue,
  hasSyncSetup,
}: {
  hasImport: boolean
  hasRepeatCustomers: boolean
  hasWinbackQueue: boolean
  hasSyncSetup: boolean
}): ActivationNextAction {
  if (!hasImport) {
    return {
      title: 'Import 20-50 real orders first',
      detail: 'A small real export is enough to prove identity matching, repeat detection, and the first retention view.',
      href: '/imports',
      cta: 'Import orders',
    }
  }

  if (!hasRepeatCustomers) {
    return {
      title: 'Import older history to reveal second purchases',
      detail: 'Recent orders alone often hide repeat behavior. Add prior months so the system can find second-order paths.',
      href: '/imports',
      cta: 'Add history',
    }
  }

  if (hasWinbackQueue && hasSyncSetup) {
    return {
      title: 'Expand from reporting into operating cadence',
      detail: 'Review repeat buyers weekly, refresh win-back focus, and keep source-channel repeat paths current.',
      href: '/analytics',
      cta: 'Open analytics',
    }
  }

  if (hasWinbackQueue) {
    return {
      title: 'Open the win-back queue before adding new features',
      detail: 'The fastest revenue recovery is usually buyers who already trusted the store and stopped buying.',
      href: buildCustomersHref({ segment: 'winback', sort: 'lastOrder' }),
      cta: 'Open queue',
    }
  }

  if (!hasSyncSetup) {
    return {
      title: 'Schedule recurring CSV sync',
      detail: 'Once the first import is clean, connect a CSV URL so operators do not have to rebuild reports manually.',
      href: '/income?tab=sync',
      cta: 'Set sync',
    }
  }

  return {
    title: 'Expand from reporting into operating cadence',
    detail: 'Review repeat buyers weekly, refresh win-back focus, and keep source-channel repeat paths current.',
    href: '/analytics',
    cta: 'Open analytics',
  }
}
