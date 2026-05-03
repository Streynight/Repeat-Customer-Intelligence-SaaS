import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  IntegrationWebhookError,
  recordIntegrationWebhook,
  webhookDedupeKey,
} from '@/lib/services/integration-webhook'

const txMock = vi.hoisted(() => ({
  integrationConnection: {
    findFirst: vi.fn(),
  },
  ingestionJob: {
    upsert: vi.fn(),
  },
  rawEvent: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
}))

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/observability', () => ({
  recordSystemEvent: vi.fn(),
}))

describe('integration webhook ingestion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.$transaction.mockImplementation(async (callback) => callback(txMock))
    txMock.integrationConnection.findFirst.mockResolvedValue({
      id: 'conn-1',
      workspaceId: 'workspace-1',
      provider: 'shopify',
    })
    txMock.ingestionJob.upsert.mockResolvedValue({ id: 'job-1' })
    txMock.rawEvent.findUnique.mockResolvedValue(null)
    txMock.rawEvent.upsert.mockResolvedValue({ id: 'raw-1' })
  })

  it('records webhook payloads with DB-backed idempotency and a queued ingestion job', async () => {
    const result = await recordIntegrationWebhook({
      provider: 'shopify',
      connectionId: 'conn-1',
      payload: { id: 'evt-1', event: 'orders/create', created: 1_700_000_000 },
    })

    expect(result).toEqual({
      rawEventId: 'raw-1',
      ingestionJobId: 'job-1',
      duplicate: false,
    })
    expect(txMock.integrationConnection.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'conn-1',
        provider: 'shopify',
        status: { not: 'disconnected' },
      },
      select: { id: true, workspaceId: true, provider: true },
    })
    expect(txMock.ingestionJob.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { idempotencyKey: 'webhook:shopify:conn-1:evt-1' },
      create: expect.objectContaining({
        workspaceId: 'workspace-1',
        connectionId: 'conn-1',
        provider: 'shopify',
        jobType: 'webhookImport',
        status: 'queued',
      }),
    }))
    expect(txMock.rawEvent.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        workspaceId_provider_dedupeKey: {
          workspaceId: 'workspace-1',
          provider: 'shopify',
          dedupeKey: 'shopify:conn-1:evt-1',
        },
      },
      create: expect.objectContaining({
        ingestionJobId: 'job-1',
        eventType: 'orders/create',
      }),
    }))
  })

  it('uses stable payload hashes when provider payloads do not include external ids', () => {
    const first = webhookDedupeKey('shopify', 'conn-1', { b: 2, a: 1 })
    const second = webhookDedupeKey('shopify', 'conn-1', { a: 1, b: 2 })

    expect(first).toBe(second)
    expect(first).toMatch(/^shopify:conn-1:[a-f0-9]{64}$/)
  })

  it('returns duplicate when the raw event already exists', async () => {
    txMock.rawEvent.findUnique.mockResolvedValueOnce({ id: 'raw-1' })

    const result = await recordIntegrationWebhook({
      provider: 'shopify',
      connectionId: 'conn-1',
      payload: { id: 'evt-1' },
    })

    expect(result.duplicate).toBe(true)
  })

  it('rejects non-object payloads and missing connections', async () => {
    await expect(recordIntegrationWebhook({
      provider: 'shopify',
      connectionId: 'conn-1',
      payload: ['not', 'an', 'object'],
    })).rejects.toMatchObject({ status: 400 })

    txMock.integrationConnection.findFirst.mockResolvedValueOnce(null)
    await expect(recordIntegrationWebhook({
      provider: 'shopify',
      connectionId: 'missing',
      payload: { id: 'evt-1' },
    })).rejects.toBeInstanceOf(IntegrationWebhookError)
  })
})
