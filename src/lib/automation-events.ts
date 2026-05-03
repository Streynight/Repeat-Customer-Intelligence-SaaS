export type LifecycleAutomationType = 'churnAlert' | 'winBack' | 'repeatReminder' | 'vipDetected' | 'revenueAnomaly'

type LifecycleAutomationEventData = {
  workspaceId: string
  type: LifecycleAutomationType
  status: 'queued'
  idempotencyKey?: string
  payload: Record<string, unknown>
}

export type AutomationEventWriter = {
  create(args: { data: LifecycleAutomationEventData, select: { id: true } }): Promise<{ id: string }>
  upsert(args: {
    where: { idempotencyKey: string }
    update: Record<string, never>
    create: LifecycleAutomationEventData
    select: { id: true }
  }): Promise<{ id: string }>
}

export function lifecycleAutomationIdempotencyKey(eventId: string | undefined | null) {
  return eventId ? `automation:${eventId}` : null
}

export function normalizeAutomationType(value: unknown): LifecycleAutomationType {
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

export async function recordLifecycleAutomationEvent(
  automationEvent: AutomationEventWriter,
  input: {
    workspaceId: string
    eventId?: string | null
    type: unknown
    payload: Record<string, unknown>
  },
) {
  const idempotencyKey = lifecycleAutomationIdempotencyKey(input.eventId)
  const data: LifecycleAutomationEventData = {
    workspaceId: input.workspaceId,
    type: normalizeAutomationType(input.type),
    status: 'queued',
    payload: {
      ...input.payload,
      ...(input.eventId ? { inngestEventId: input.eventId } : {}),
    },
    ...(idempotencyKey ? { idempotencyKey } : {}),
  }

  if (!idempotencyKey) {
    return automationEvent.create({
      data,
      select: { id: true },
    })
  }

  return automationEvent.upsert({
    where: { idempotencyKey },
    update: {},
    create: data,
    select: { id: true },
  })
}
