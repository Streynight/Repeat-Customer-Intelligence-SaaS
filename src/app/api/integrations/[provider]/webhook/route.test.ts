import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'
import { IntegrationWebhookError, recordIntegrationWebhook } from '@/lib/services/integration-webhook'

vi.mock('@/lib/services/integration-webhook', () => {
  class IntegrationWebhookError extends Error {
    constructor(message: string, readonly status: number) {
      super(message)
      this.name = 'IntegrationWebhookError'
    }
  }

  return {
    IntegrationWebhookError,
    recordIntegrationWebhook: vi.fn(),
  }
})

vi.mock('@/lib/observability', () => ({
  captureOperationalError: vi.fn(),
}))

describe('/api/integrations/[provider]/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('INTEGRATION_WEBHOOK_SECRET', 'secret-1')
    vi.mocked(recordIntegrationWebhook).mockResolvedValue({
      rawEventId: 'raw-1',
      ingestionJobId: 'job-1',
      duplicate: false,
    })
  })

  it('rejects unauthorized webhook requests', async () => {
    const response = await POST(webhookRequest({ authorized: false }), routeParams('shopify'))

    expect(response.status).toBe(401)
    expect(recordIntegrationWebhook).not.toHaveBeenCalled()
  })

  it('records authorized webhook payloads', async () => {
    const response = await POST(webhookRequest(), routeParams('shopify'))
    const body = await response.json()

    expect(response.status).toBe(202)
    expect(body).toEqual({
      ok: true,
      rawEventId: 'raw-1',
      ingestionJobId: 'job-1',
      duplicate: false,
    })
    expect(recordIntegrationWebhook).toHaveBeenCalledWith({
      provider: 'shopify',
      connectionId: 'conn-1',
      payload: { id: 'evt-1' },
    })
  })

  it('returns 200 for duplicate webhook payloads', async () => {
    vi.mocked(recordIntegrationWebhook).mockResolvedValueOnce({
      rawEventId: 'raw-1',
      ingestionJobId: 'job-1',
      duplicate: true,
    })

    const response = await POST(webhookRequest(), routeParams('shopify'))

    expect(response.status).toBe(200)
  })

  it('maps validation errors to their explicit status codes', async () => {
    vi.mocked(recordIntegrationWebhook).mockRejectedValueOnce(new IntegrationWebhookError('Connection not found.', 404))

    const response = await POST(webhookRequest(), routeParams('shopify'))
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body).toEqual({ ok: false, error: 'Connection not found.' })
  })

  it('rejects invalid JSON payloads before recording', async () => {
    const request = new NextRequest('http://localhost/api/integrations/shopify/webhook?connection_id=conn-1', {
      method: 'POST',
      headers: { authorization: 'Bearer secret-1' },
      body: '{',
    })

    const response = await POST(request, routeParams('shopify'))

    expect(response.status).toBe(400)
    expect(recordIntegrationWebhook).not.toHaveBeenCalled()
  })
})

function webhookRequest(options: { authorized?: boolean } = {}) {
  return new NextRequest('http://localhost/api/integrations/shopify/webhook?connection_id=conn-1', {
    method: 'POST',
    headers: options.authorized === false ? {} : { authorization: 'Bearer secret-1' },
    body: JSON.stringify({ id: 'evt-1' }),
  })
}

function routeParams(provider: string) {
  return { params: Promise.resolve({ provider }) }
}
