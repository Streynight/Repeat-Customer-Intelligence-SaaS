import * as Sentry from '@sentry/nextjs'
import { captureProductEvent } from '@/lib/platform/posthog'

type TenantEventContext = {
  userId: string
  organizationId: string
  workspaceId: string
}

type SystemEventContext = Partial<TenantEventContext>

export function recordTenantEvent(input: {
  event: string
  tenant: TenantEventContext
  properties?: Record<string, unknown>
}) {
  captureProductEvent({
    distinctId: input.tenant.userId,
    event: input.event,
    properties: {
      organizationId: input.tenant.organizationId,
      workspaceId: input.tenant.workspaceId,
      ...input.properties,
    },
  })
}

export function recordSystemEvent(input: {
  event: string
  tenant?: SystemEventContext
  properties?: Record<string, unknown>
}) {
  captureProductEvent({
    distinctId: systemDistinctId(input.tenant),
    event: input.event,
    properties: {
      source: 'system',
      organizationId: input.tenant?.organizationId,
      workspaceId: input.tenant?.workspaceId,
      userId: input.tenant?.userId,
      ...input.properties,
    },
  })
}

export function captureOperationalError(error: unknown, context: {
  operation: string
  tenant?: SystemEventContext
  properties?: Record<string, unknown>
}) {
  Sentry.captureException(error, {
    tags: {
      operation: context.operation,
      organizationId: context.tenant?.organizationId,
      workspaceId: context.tenant?.workspaceId,
    },
    user: context.tenant?.userId ? { id: context.tenant.userId } : undefined,
    extra: context.properties,
  })
}

function systemDistinctId(tenant: SystemEventContext | undefined) {
  if (tenant?.userId) return tenant.userId
  if (tenant?.workspaceId) return `workspace:${tenant.workspaceId}`
  if (tenant?.organizationId) return `organization:${tenant.organizationId}`
  return 'system'
}
