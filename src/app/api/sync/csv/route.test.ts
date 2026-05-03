import { describe, expect, it, vi } from 'vitest'
import { GET, isAuthorizedCronRequest } from './route'

vi.mock('@/app/actions/finance', () => ({
  runDueCsvSyncConnections: vi.fn().mockResolvedValue([
    {
      connectionId: 'sync-1',
      status: 'success',
      totalRows: 2,
      importedRows: 1,
      startedAt: '2026-05-01T00:00:00.000Z',
      finishedAt: '2026-05-01T00:00:01.000Z',
    },
  ]),
}))

describe('/api/sync/csv', () => {
  it('rejects missing or wrong cron secret', async () => {
    vi.stubEnv('CRON_SECRET', 'secret-1')

    expect(isAuthorizedCronRequest(new Request('http://localhost/api/sync/csv'))).toBe(false)
    expect(isAuthorizedCronRequest(new Request('http://localhost/api/sync/csv', {
      headers: { authorization: 'Bearer wrong' },
    }))).toBe(false)

    const response = await GET(new Request('http://localhost/api/sync/csv'))
    expect(response.status).toBe(401)
  })

  it('runs due sync connections for authorized cron requests', async () => {
    vi.stubEnv('CRON_SECRET', 'secret-1')

    const response = await GET(new Request('http://localhost/api/sync/csv', {
      headers: { authorization: 'Bearer secret-1' },
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ ok: true, synced: 1, importedRows: 1 })
  })
})
