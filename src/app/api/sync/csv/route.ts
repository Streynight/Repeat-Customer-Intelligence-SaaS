import { runDueCsvSyncConnections } from '@/lib/services/csv-sync-runner'

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const results = await runDueCsvSyncConnections()

  return Response.json({
    ok: true,
    synced: results.length,
    importedRows: results.reduce((sum, result) => sum + result.importedRows, 0),
    results,
  })
}

export function isAuthorizedCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  return request.headers.get('authorization') === `Bearer ${secret}`
}
