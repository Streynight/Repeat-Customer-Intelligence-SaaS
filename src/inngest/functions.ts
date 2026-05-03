import { inngest } from '@/inngest/client'
import { recordLifecycleAutomationEvent, type AutomationEventWriter } from '@/lib/automation-events'
import { recordMetricRecomputeJob, type IngestionJobWriter } from '@/lib/ingestion-jobs'
import { captureOperationalError, recordSystemEvent } from '@/lib/observability'
import { prisma } from '@/lib/prisma'
import { acquireLock } from '@/lib/platform/redis'

export const recomputeWorkspaceMetrics = inngest.createFunction(
  { id: 'recompute-workspace-metrics', triggers: [{ event: 'workspace/metrics.recompute.requested' }] },
  async ({ event, step }) => {
    const workspaceId = parseWorkflowWorkspaceId(event.data.workspaceId)
    let tenant: { organizationId?: string, workspaceId?: string } = { workspaceId: workspaceId ?? undefined }

    try {
      if (!workspaceId) {
        recordSystemEvent({
          event: 'workflow_event_invalid',
          properties: { workflow: 'recompute-workspace-metrics', reason: 'missing_workspace_id', eventId: event.id },
        })

        return { skipped: true, reason: 'missing workspaceId' }
      }

      const workspace = await step.run('load workflow workspace', async () => loadWorkflowWorkspace(workspaceId))
      if (!workspace) {
        recordSystemEvent({
          event: 'workflow_workspace_missing',
          tenant,
          properties: { workflow: 'recompute-workspace-metrics', eventId: event.id },
        })

        return { skipped: true, reason: 'workspace not found' }
      }

      tenant = { organizationId: workspace.organizationId, workspaceId: workspace.id }
      const lock = await acquireLock(`workspace-metrics:${workspaceId}`, 300)

      if (!lock.acquired) {
        recordSystemEvent({
          event: 'metric_recompute_job_skipped',
          tenant,
          properties: { reason: 'already_running', eventId: event.id },
        })

        return { skipped: true, reason: 'metric recompute already running' }
      }

      try {
        const result = await step.run('record metric recompute job', async () => {
          return recordMetricRecomputeJob(prisma.ingestionJob as unknown as IngestionJobWriter, {
            workspaceId,
            eventId: event.id,
          })
        })

        recordSystemEvent({
          event: 'metric_recompute_job_queued',
          tenant,
          properties: { ingestionJobId: result.id, eventId: event.id },
        })

        return { skipped: false, ingestionJobId: result.id }
      } finally {
        await lock.release()
      }
    } catch (error) {
      captureOperationalError(error, {
        operation: 'inngest.metrics.recompute',
        tenant,
        properties: { eventId: event.id },
      })
      throw error
    }
  },
)

export const sendLifecycleAutomation = inngest.createFunction(
  { id: 'send-lifecycle-automation', triggers: [{ event: 'automation/lifecycle.triggered' }] },
  async ({ event, step }) => {
    const workspaceId = parseWorkflowWorkspaceId(event.data.workspaceId)
    let tenant: { organizationId?: string, workspaceId?: string } = { workspaceId: workspaceId ?? undefined }

    try {
      if (!workspaceId) {
        recordSystemEvent({
          event: 'workflow_event_invalid',
          properties: { workflow: 'send-lifecycle-automation', reason: 'missing_workspace_id', eventId: event.id },
        })

        return { skipped: true, reason: 'missing workspaceId' }
      }

      const workspace = await step.run('load workflow workspace', async () => loadWorkflowWorkspace(workspaceId))
      if (!workspace) {
        recordSystemEvent({
          event: 'workflow_workspace_missing',
          tenant,
          properties: { workflow: 'send-lifecycle-automation', eventId: event.id },
        })

        return { skipped: true, reason: 'workspace not found' }
      }

      tenant = { organizationId: workspace.organizationId, workspaceId: workspace.id }

      const result = await step.run('record automation event', async () => {
        return recordLifecycleAutomationEvent(prisma.automationEvent as unknown as AutomationEventWriter, {
          workspaceId,
          eventId: event.id,
          type: event.data.type,
          payload: event.data as Record<string, unknown>,
        })
      })

      recordSystemEvent({
        event: 'lifecycle_automation_event_queued',
        tenant,
        properties: { automationEventId: result.id, eventId: event.id },
      })

      return { skipped: false, automationEventId: result.id }
    } catch (error) {
      captureOperationalError(error, {
        operation: 'inngest.lifecycle_automation',
        tenant,
        properties: { eventId: event.id },
      })
      throw error
    }
  },
)

export const functions = [recomputeWorkspaceMetrics, sendLifecycleAutomation]

function parseWorkflowWorkspaceId(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

async function loadWorkflowWorkspace(workspaceId: string) {
  return prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, organizationId: true },
  })
}
