import { describe, expect, it } from 'vitest'
import { analyzeImportRows, defaultMapping, detectColumnMapping, rowsToOrders, sheetRowsToRecords } from '@/lib/services/import-pipeline'
import { csvRow, makeCustomer, makeDataset } from '@/test/fixtures'

describe('analyzeImportRows', () => {
  it('reports valid rows and likely phone merges', () => {
    const diagnostics = analyzeImportRows(
      [csvRow({ phone: '081-234-5001', email: '' })],
      'shopee',
      defaultMapping,
      makeDataset([makeCustomer({ phone: '0812345001' })]),
    )

    expect(diagnostics.canImport).toBe(true)
    expect(diagnostics.validRows).toBe(1)
    expect(diagnostics.invalidRows).toBe(0)
    expect(diagnostics.likelyMergeCounts.phone).toBe(1)
  })

  it('blocks import when required mappings are missing', () => {
    const diagnostics = analyzeImportRows(
      [csvRow()],
      'shopee',
      { ...defaultMapping, totalAmount: '' },
      makeDataset(),
    )

    expect(diagnostics.canImport).toBe(false)
    expect(diagnostics.missingRequiredMappings).toContain('totalAmount')
    expect(diagnostics.issues.some((issue) => issue.severity === 'error')).toBe(true)
  })

  it('reports bad dates, bad amounts, missing contacts, and duplicate order IDs', () => {
    const diagnostics = analyzeImportRows(
      [
        csvRow({ order_id: 'DUP-1', order_date: 'not-a-date', total_amount: '0', phone: '', email: '' }),
        csvRow({ order_id: 'DUP-1', customer_name: 'Niran Cha', phone: '', email: '' }),
      ],
      'tiktok',
      defaultMapping,
      makeDataset(),
    )

    expect(diagnostics.canImport).toBe(true)
    expect(diagnostics.totalRows).toBe(2)
    expect(diagnostics.validRows).toBe(1)
    expect(diagnostics.invalidRows).toBe(1)
    expect(diagnostics.badDates).toBe(1)
    expect(diagnostics.badAmounts).toBe(1)
    expect(diagnostics.missingContactRows).toBe(2)
    expect(diagnostics.duplicateOrderIds).toBe(1)
  })

  it('counts email, line ID, and fuzzy name merge candidates', () => {
    const dataset = makeDataset([
      makeCustomer({ id: 'email-match', email: 'email@example.com', phone: undefined, lineId: undefined }),
      makeCustomer({ id: 'line-match', email: undefined, phone: undefined, lineId: 'line_123', fullName: 'Other Buyer' }),
      makeCustomer({ id: 'name-match', email: undefined, phone: undefined, lineId: undefined, fullName: 'Chanida Rattan' }),
    ])

    const diagnostics = analyzeImportRows(
      [
        csvRow({ order_id: 'E-1', email: 'EMAIL@example.com', phone: '', line_id: '', customer_name: 'No Name' }),
        csvRow({ order_id: 'L-1', email: '', phone: '', line_id: 'LINE_123', customer_name: 'Other Buyer' }),
        csvRow({ order_id: 'F-1', email: '', phone: '', line_id: '', customer_name: 'Chanida Rattan.' }),
      ],
      'csv',
      defaultMapping,
      dataset,
    )

    expect(diagnostics.likelyMergeCounts.email).toBe(1)
    expect(diagnostics.likelyMergeCounts.lineId).toBe(1)
    expect(diagnostics.likelyMergeCounts.fuzzyName).toBe(1)
  })

  it('maps optional finance columns into order inputs', () => {
    const [order] = rowsToOrders([
      csvRow({
        tax_amount: '70',
        discount_amount: '20',
        shipping_amount: '40',
        platform_fee_amount: '30',
        refund_amount: '10',
      }),
    ], 'shopee', defaultMapping)

    expect(defaultMapping.taxAmount).toBe('tax_amount')
    expect(defaultMapping.platformFeeAmount).toBe('platform_fee_amount')
    expect(order).toMatchObject({
      taxAmount: 70,
      discountAmount: 20,
      shippingAmount: 40,
      platformFeeAmount: 30,
      refundAmount: 10,
    })
  })

  it('converts marketplace spreadsheet rows and auto-maps mixed headers', () => {
    const parsed = sheetRowsToRecords([
      ['Shopee export report', null, null],
      ['Order SN', 'Buyer Name', 'Recipient Phone', 'Created Time', 'Order Total', 'Item Name', 'Seller SKU', 'Qty'],
      ['SHP-1', 'Mali Wong', '0812345001', new Date('2026-05-01T00:00:00.000Z'), 1290, 'Serum', 'SERUM-001', 1],
    ])
    const mapping = detectColumnMapping(parsed.fields, 'shopee')
    const [order] = rowsToOrders(parsed.rows, 'shopee', mapping)

    expect(parsed.errors).toEqual([])
    expect(mapping).toMatchObject({
      externalOrderId: 'Order SN',
      customerNameRaw: 'Buyer Name',
      phoneRaw: 'Recipient Phone',
      orderDate: 'Created Time',
      totalAmount: 'Order Total',
      productName: 'Item Name',
      sku: 'Seller SKU',
      quantity: 'Qty',
    })
    expect(order).toMatchObject({
      externalOrderId: 'SHP-1',
      customerNameRaw: 'Mali Wong',
      phoneRaw: '0812345001',
      totalAmount: 1290,
      sourceChannel: 'shopee',
    })
    expect(order.items[0]).toMatchObject({
      productName: 'Serum',
      sku: 'SERUM-001',
    })
  })

  it('auto-maps Thai marketplace headers', () => {
    const fields = ['หมายเลขคำสั่งซื้อ', 'ชื่อผู้ซื้อ', 'เบอร์โทรศัพท์', 'วันที่สั่งซื้อ', 'ยอดชำระ', 'ชื่อสินค้า', 'รหัสสินค้า', 'จำนวน']
    const mapping = detectColumnMapping(fields)

    expect(mapping).toMatchObject({
      externalOrderId: 'หมายเลขคำสั่งซื้อ',
      customerNameRaw: 'ชื่อผู้ซื้อ',
      phoneRaw: 'เบอร์โทรศัพท์',
      orderDate: 'วันที่สั่งซื้อ',
      totalAmount: 'ยอดชำระ',
      productName: 'ชื่อสินค้า',
      sku: 'รหัสสินค้า',
      quantity: 'จำนวน',
    })
  })

  it('uses marketplace presets for platform-specific column names', () => {
    const mapping = detectColumnMapping([
      'Order Number',
      'Buyer Name',
      'Buyer Phone',
      'Created At',
      'Paid Price',
      'Product Name',
      'Shop SKU',
    ], 'lazada')

    expect(mapping).toMatchObject({
      externalOrderId: 'Order Number',
      customerNameRaw: 'Buyer Name',
      phoneRaw: 'Buyer Phone',
      orderDate: 'Created At',
      totalAmount: 'Paid Price',
      productName: 'Product Name',
      sku: 'Shop SKU',
    })
  })
})
