import { inngest } from '@/inngest/client'
import { recordMetricRecomputeJob, type IngestionJobWriter } from '@/lib/ingestion-jobs'
import { prisma } from '@/lib/prisma'
import { acquireLock } from '@/lib/platform/redis'

export const recomputeWorkspaceMetrics = inngest.createFunction(
  { id: 'recompute-workspace-metrics', triggers: [{ event: 'workspace/metrics.recompute.requested' }] },
  async ({ event, step }) => {
    const workspaceId = String(event.data.workspaceId)
    const lock = await acquireLock(`workspace-metrics:${workspaceId}`, 300)

    if (!lock.acquired) {
      return { skipped: true, reason: 'metric recompute already running' }
    }

    try {
      const result = await step.run('record metric recompute job', async () => {
        return recordMetricRecomputeJob(prisma.ingestionJob as unknown as IngestionJobWriter, {
          workspaceId,
          eventId: event.id,
        })
      })

      return { skipped: false, ingestionJobId: result.id }
    } finally {
      await lock.release()
    }
  },
)

export const sendLifecycleAutomation = inngest.createFunction(
  { id: 'send-lifecycle-automation', triggers: [{ event: 'automation/lifecycle.triggered' }] },
  async ({ event, step }) => {
    const workspaceId = String(event.data.workspaceId)

    return step.run('record automation event', async () => {
      const automationType = normalizeAutomationType(event.data.type)
      const automationEvent = await prisma.automationEvent.create({
        data: {
          workspaceId,
          type: automationType,
          status: 'queued',
          payload: event.data,
        },
        select: { id: true },
      })

      return { automationEventId: automationEvent.id }
    })
  },
)

export const functions = [recomputeWorkspaceMetrics, sendLifecycleAutomation]

function normalizeAutomationType(value: unknown) {
  if (
    value === 'churnAlert' ||
    value === 'winBack' ||
    value === 'repeatReminder' ||
    value === 'vipDetected' ||
    value === 'revenueAnomaly'
  ) {
    return value
  }

  return 'churnAlert'
}
