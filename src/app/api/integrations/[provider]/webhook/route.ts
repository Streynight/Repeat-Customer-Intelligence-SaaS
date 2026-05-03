import { NextResponse, type NextRequest } from 'next/server'
import { getIntegrationContract } from '@/lib/integrations/providers'
import { captureOperationalError } from '@/lib/observability'
import { IntegrationWebhookError, recordIntegrationWebhook } from '@/lib/services/integration-webhook'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params
  const contract = getIntegrationContract(provider)
  if (!contract) {
    return NextResponse.json({ ok: false, error: 'Unsupported provider.' }, { status: 404 })
  }

  if (!isAuthorizedWebhook(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 })
  }

  const connectionId = request.nextUrl.searchParams.get('connection_id')
  if (!connectionId) {
    return NextResponse.json({ ok: false, error: 'Missing connection_id.' }, { status: 400 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Webhook payload must be valid JSON.' }, { status: 400 })
  }

  try {
    const result = await recordIntegrationWebhook({
      provider: contract.provider,
      connectionId,
      payload,
    })

    return NextResponse.json({ ok: true, ...result }, { status: result.duplicate ? 200 : 202 })
  } catch (error) {
    if (error instanceof IntegrationWebhookError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status })
    }

    captureOperationalError(error, {
      operation: 'integration.webhook',
      properties: { provider, connectionId },
    })

    return NextResponse.json({ ok: false, error: 'Webhook could not be recorded.' }, { status: 500 })
  }
}

function isAuthorizedWebhook(request: NextRequest) {
  const secret = process.env.INTEGRATION_WEBHOOK_SECRET
  if (!secret) return false

  return request.headers.get('authorization') === `Bearer ${secret}`
}
