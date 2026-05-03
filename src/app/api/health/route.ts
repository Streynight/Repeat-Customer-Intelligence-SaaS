import { NextResponse } from 'next/server'
import { publicHealthSummary, runProductionHealthChecks } from '@/lib/production-health'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const includeDetails = url.searchParams.get('deep') === '1'

  if (includeDetails && !hasHealthAccess(request)) {
    return NextResponse.json({ ok: false, error: 'Health check details are not authorized.' }, { status: 401 })
  }

  const report = await runProductionHealthChecks({ includeLiveChecks: includeDetails })
  const payload = includeDetails ? report : publicHealthSummary(report)

  return NextResponse.json(payload, {
    status: report.status === 'fail' ? 503 : 200,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

function hasHealthAccess(request: Request) {
  const secret = process.env.HEALTHCHECK_SECRET
  if (!secret) return false

  return request.headers.get('x-health-secret') === secret
}
