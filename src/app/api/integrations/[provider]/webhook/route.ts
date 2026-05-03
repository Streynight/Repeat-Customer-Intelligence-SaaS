import { NextResponse, type NextRequest } from 'next/server'
import { getIntegrationContract } from '@/lib/integrations/providers'
import { prisma } from '@/lib/prisma'
import { isIdempotencyKeyUsed } from '@/lib/platform/redis'

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

  const connection = await prisma.integrationConnection.findUnique({
    where: { id: connectionId },
    select: { id: true, workspaceId: true, provider: true },
  })

  if (!connection || connection.provider !== provider) {
    return NextResponse.json({ ok: false, error: 'Connection not found.' }, { status: 404 })
  }

  const payload = await request.json()
  const externalId = readExternalId(payload)
  const dedupeKey = `${provider}:${connection.id}:${externalId ?? crypto.randomUUID()}`

  if (await isIdempotencyKeyUsed(dedupeKey)) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  const rawEvent = await prisma.rawEvent.create({
    data: {
      workspaceId: connection.workspaceId,
      connectionId: connection.id,
      provider,
      externalId,
      dedupeKey,
      eventType: String(payload.type ?? payload.event ?? 'webhook'),
      occurredAt: payload.created_at || payload.created ? new Date(payload.created_at ?? payload.created) : null,
      payload,
      status: 'received',
    },
    select: { id: true },
  })

  return NextResponse.json({ ok: true, rawEventId: rawEvent.id }, { status: 202 })
}

function isAuthorizedWebhook(request: NextRequest) {
  const secret = process.env.INTEGRATION_WEBHOOK_SECRET
  if (!secret) return false

  return request.headers.get('authorization') === `Bearer ${secret}`
}

function readExternalId(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Record<string, unknown>
  const candidate = record.id ?? record.order_id ?? record.event_id

  return candidate ? String(candidate) : null
}
