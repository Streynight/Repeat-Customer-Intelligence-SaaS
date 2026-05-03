import { describe, expect, it } from 'vitest'
import { runCsvSyncFromText, testCsvSyncUrl } from '@/lib/services/csv-sync'
import { createEmptyDataset } from '@/lib/empty-dataset'
import { csvRow, makeCustomer, makeDataset, makeOrder } from '@/test/fixtures'

describe('csv sync service', () => {
  it('dedupes already-imported orders', () => {
    const existingOrder = {
      ...makeOrder({ externalOrderId: 'EXISTING-1', sourceChannel: 'shopee' }),
      id: 'existing-order-1',
      customerProfileId: 'customer-1',
    }
    const dataset = makeDataset([
      makeCustomer({
        firstChannel: 'shopee',
        lastChannel: 'shopee',
        orders: [existingOrder],
      }),
    ])
    const result = runCsvSyncFromText(
      {
        id: 'sync-1',
        name: 'Shopee hourly',
        csvUrl: 'https://example.com/orders.csv',
        sourceChannel: 'shopee',
        enabled: true,
      },
      dataset,
      toCsv([
        csvRow({ order_id: 'EXISTING-1', order_date: '2026-04-01' }),
        csvRow({ order_id: 'NEW-1', order_date: '2026-04-02', phone: '0819999999' }),
      ]),
    )

    expect(result.run.status).toBe('success')
    expect(result.run.totalRows).toBe(2)
    expect(result.run.importedRows).toBe(1)
    expect(result.dataset.orders.some((order) => order.externalOrderId === 'NEW-1')).toBe(true)
    expect(result.dataset.imports[0]).toMatchObject({ importedRows: 1, totalRows: 2 })
  })

  it('skips disabled connections', () => {
    const result = runCsvSyncFromText(
      {
        id: 'sync-1',
        name: 'Disabled',
        csvUrl: 'https://example.com/orders.csv',
        sourceChannel: 'csv',
        enabled: false,
      },
      createEmptyDataset(),
      toCsv([csvRow()]),
    )

    expect(result.run.status).toBe('skipped')
    expect(result.dataset.orders).toEqual([])
  })

  it('tests an HTTPS CSV URL before saving', async () => {
    const result = await testCsvSyncUrl(
      'https://example.com/orders.csv',
      'shopee',
      {},
      async () => toCsv([csvRow({ order_id: 'SYNC-1' })]),
    )

    expect(result.canImport).toBe(true)
    expect(result.importableRows).toBe(1)
  })
})

function toCsv(rows: Array<Record<string, string>>) {
  const headers = Object.keys(rows[0])
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => row[header]).join(',')),
  ].join('\n')
}
