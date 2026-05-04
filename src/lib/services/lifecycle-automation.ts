import { inngest } from '@/inngest/client'
import { buildAutomationSignals, type AutomationSignal } from '@/lib/automation/rules'
import { recordTenantEvent } from '@/lib/observability'
import type { LifecycleAutomationType } from '@/lib/automation-events'
import type { TenantContext } from '@/lib/tenancy'
import type { IntelligenceDataset } from '@/lib/types'

const lifecycleAutomationEventName = 'automation/lifecycle.triggered'
const maxLifecycleAutomationSignalsPerRun = 25
const priorityRank: Record<AutomationSignal['priority'], number> = {
  high: 0,
  medium: 1,
  low: 2,
}

export type QueueLifecycleAutomationOptions = {
  source: 'dataset_import' | 'csv_sync'
  today?: Date
  limit?: number
}

export type QueueLifecycleAutomationResult = {
  queued: number
  skipped: number
}

export async function queueLifecycleAutomationForDataset(
  context: TenantContext,
  dataset: IntelligenceDataset,
  options: QueueLifecycleAutomationOptions,
): Promise<QueueLifecycleAutomationResult> {
  const limit = normalizeSignalLimit(options.limit)
  const signals = buildAutomationSignals(dataset, options.today)
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || b.value - a.value)
  const selectedSignals = signals.slice(0, limit)

  if (selectedSignals.length === 0) {
    return { queued: 0, skipped: 0 }
  }

  await inngest.send(selectedSignals.map((signal) => toLifecycleAutomationEvent(context, signal, options.source)))

  const skipped = Math.max(signals.length - selectedSignals.length, 0)
  recordTenantEvent({
    event: 'lifecycle_automation_signals_queued',
    tenant: context,
    properties: {
      source: options.source,
      queued: selectedSignals.length,
      skipped,
    },
  })

  return { queued: selectedSignals.length, skipped }
}

function toLifecycleAutomationEvent(
  context: TenantContext,
  signal: AutomationSignal,
  source: QueueLifecycleAutomationOptions['source'],
) {
  return {
    id: lifecycleAutomationEventId(context.workspaceId, signal),
    name: lifecycleAutomationEventName,
    data: {
      workspaceId: context.workspaceId,
      type: signal.type satisfies LifecycleAutomationType,
      priority: signal.priority,
      title: signal.title,
      value: signal.value,
      source,
      signalKey: signal.dedupeKey,
      ...(signal.customerId ? { customerProfileId: signal.customerId } : {}),
    },
  }
}

function lifecycleAutomationEventId(workspaceId: string, signal: AutomationSignal) {
  return `lifecycle:${workspaceId}:${encodeURIComponent(signal.dedupeKey)}`
}

function normalizeSignalLimit(value: number | undefined) {
  if (value === undefined) return maxLifecycleAutomationSignalsPerRun
  if (!Number.isInteger(value) || value < 1 || value > maxLifecycleAutomationSignalsPerRun) {
    throw new Error(`Lifecycle automation queue limit must be between 1 and ${maxLifecycleAutomationSignalsPerRun}.`)
  }
  return value
}
