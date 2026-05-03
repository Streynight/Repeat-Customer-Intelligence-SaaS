import { createHash } from 'node:crypto'
import type { Prisma } from '@/generated/prisma/client'
import { getIntegrationContract, type NativeIntegrationProvider } from '@/lib/integrations/providers'
import { recordSystemEvent } from '@/lib/observability'
import { prisma } from '@/lib/prisma'

export class IntegrationWebhookError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'IntegrationWebhookError'
  }
}

export type IntegrationWebhookInput = {
  provider: string
  connectionId: string
  payload: unknown
}

export async function recordIntegrationWebhook(input: IntegrationWebhookInput) {
  const contract = getIntegrationContract(input.provider)
  if (!contract) throw new IntegrationWebhookError('Unsupported provider.', 404)

  const payload = normalizeWebhookPayload(input.payload)
  const externalId = readExternalId(payload)

  return prisma.$transaction(async (tx) => {
    const connection = await tx.integrationConnection.findFirst({
      where: {
        id: input.connectionId,
        provider: contract.provider,
        status: { not: 'disconnected' },
      },
      select: { id: true, workspaceId: true, provider: true },
    })

    if (!connection) {
      throw new IntegrationWebhookError('Connection not found.', 404)
    }

    const dedupeKey = webhookDedupeKey(contract.provider, connection.id, payload, externalId)
    const ingestionJob = await tx.ingestionJob.upsert({
      where: { idempotencyKey: `webhook:${dedupeKey}` },
      update: {},
      create: {
        workspaceId: connection.workspaceId,
        connectionId: connection.id,
        provider: contract.provider,
        jobType: 'webhookImport',
        status: 'queued',
        idempotencyKey: `webhook:${dedupeKey}`,
      },
      select: { id: true },
    })

    const existing = await tx.rawEvent.findUnique({
      where: {
        workspaceId_provider_dedupeKey: {
          workspaceId: connection.workspaceId,
          provider: contract.provider,
          dedupeKey,
        },
      },
      select: { id: true },
    })

    const rawEvent = await tx.rawEvent.upsert({
      where: {
        workspaceId_provider_dedupeKey: {
          workspaceId: connection.workspaceId,
          provider: contract.provider,
          dedupeKey,
        },
      },
      update: {},
      create: {
        workspaceId: connection.workspaceId,
        connectionId: connection.id,
        ingestionJobId: ingestionJob.id,
        provider: contract.provider,
        externalId,
        dedupeKey,
        eventType: readEventType(payload),
        occurredAt: readOccurredAt(payload),
        payload: payload as Prisma.InputJsonValue,
        status: 'received',
      },
      select: { id: true },
    })

    recordSystemEvent({
      event: 'integration_webhook_received',
      tenant: { workspaceId: connection.workspaceId },
      properties: {
        provider: contract.provider,
        connectionId: connection.id,
        rawEventId: rawEvent.id,
        ingestionJobId: ingestionJob.id,
        duplicate: Boolean(existing),
      },
    })

    return {
      rawEventId: rawEvent.id,
      ingestionJobId: ingestionJob.id,
      duplicate: Boolean(existing),
    }
  })
}

export function webhookDedupeKey(
  provider: NativeIntegrationProvider,
  connectionId: string,
  payload: Record<string, unknown>,
  externalId = readExternalId(payload),
) {
  return `${provider}:${connectionId}:${externalId ?? stablePayloadHash(payload)}`
}

function normalizeWebhookPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new IntegrationWebhookError('Webhook payload must be a JSON object.', 400)
  }

  return payload as Record<string, unknown>
}

function readExternalId(payload: Record<string, unknown>) {
  const candidate = payload.id ?? payload.order_id ?? payload.event_id

  return candidate ? String(candidate) : null
}

function readEventType(payload: Record<string, unknown>) {
  return String(payload.type ?? payload.event ?? 'webhook').slice(0, 120)
}

function readOccurredAt(payload: Record<string, unknown>) {
  const value = payload.occurred_at ?? payload.created_at ?? payload.created
  if (typeof value !== 'string' && typeof value !== 'number') return null

  const timestamp = typeof value === 'number' && value < 10_000_000_000
    ? value * 1000
    : value
  const date = new Date(timestamp)

  return Number.isNaN(date.getTime()) ? null : date
}

function stablePayloadHash(payload: Record<string, unknown>) {
  return createHash('sha256').update(stableStringify(payload)).digest('hex')
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`
  }

  return JSON.stringify(value)
}
