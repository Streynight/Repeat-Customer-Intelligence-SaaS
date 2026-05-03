import { createCustomerFromOrder, mergeOrderIntoCustomer, resolveCustomerIdentity } from '@/lib/services/identity'
import { defaultVipThreshold } from '@/lib/empty-dataset'
import type { IntelligenceDataset, OrderInput } from '@/lib/types'

const orders: OrderInput[] = [
  order('SHP-1001', 'shopee', 'Mali Wong', 'mali@example.com', '0812345001', 'Bangkok', '2026-01-05', 1850, 'Glow serum'),
  order('IG-2041', 'instagram', 'Mali W.', '', '0812345001', 'Bangkok', '2026-02-11', 2200, 'Night repair set'),
  order('TT-3310', 'tiktok', 'Mali Wong', 'mali@example.com', '0812345001', 'Bangkok', '2026-03-03', 2890, 'Brightening bundle'),
  order('WEB-147', 'website', 'Mali Wong', 'mali@example.com', '0812345001', 'Bangkok', '2026-04-19', 3450, 'VIP glow kit'),

  order('TT-4101', 'tiktok', 'Pimchanok S', 'pim@example.com', '0827719002', 'Nonthaburi', '2026-01-18', 1490, 'Trial skincare set'),
  order('TT-4214', 'tiktok', 'Pim S.', '', '0827719002', 'Nonthaburi', '2026-02-08', 2190, 'AHA serum'),
  order('SHP-1309', 'shopee', 'Pimchanok S', 'pim@example.com', '0827719002', 'Nonthaburi', '2026-03-28', 1890, 'Moisture refill'),

  order('FB-8870', 'facebook', 'Niran Cha', 'niran@example.com', '0897771002', 'Chiang Mai', '2026-01-12', 990, 'Starter kit'),
  order('SHP-1030', 'shopee', 'Niran Cha', 'niran@example.com', '0897771002', 'Chiang Mai', '2026-04-21', 1590, 'Refill pack'),

  order('TT-3318', 'tiktok', 'Arisa P', 'arisa@example.com', '0821112233', 'Chonburi', '2026-02-01', 740, 'Mini cleanser'),
  order('WEB-120', 'website', 'Arisa P.', 'arisa@example.com', '0821112233', 'Chonburi', '2026-03-02', 1280, 'Moisture duo'),
  order('WEB-133', 'website', 'Arisa P', 'arisa@example.com', '0821112233', 'Chonburi', '2026-04-17', 2400, 'VIP bundle'),

  order('IG-2099', 'instagram', 'Ploy Suda', '', '0839991000', 'Phuket', '2025-12-20', 1250, 'Body care'),
  order('IG-2130', 'instagram', 'Ploy S.', '', '0839991000', 'Phuket', '2026-01-05', 1350, 'Body care refill'),

  order('FB-9001', 'facebook', 'Somchai Lee', 'somchai@example.com', '0861237777', 'Khon Kaen', '2026-04-11', 3200, 'Family set'),

  order('SHP-1102', 'shopee', 'Kanda P', 'kanda@example.com', '0880001212', 'Bangkok', '2026-01-08', 870, 'Trial set'),
  order('SHP-1137', 'shopee', 'Kanda P', 'kanda@example.com', '0880001212', 'Bangkok', '2026-01-30', 990, 'Refill set'),
  order('SHP-1199', 'shopee', 'Kanda P', 'kanda@example.com', '0880001212', 'Bangkok', '2026-02-28', 1100, 'Refill set'),

  order('CSV-6001', 'csv', 'Mayuree Tan', 'mayuree@example.com', '0914041500', 'Rayong', '2025-11-02', 2450, 'Hair care bundle'),
  order('FB-9120', 'facebook', 'Mayuree T.', 'mayuree@example.com', '0914041500', 'Rayong', '2026-01-14', 2650, 'Hair care refill'),
  order('CSV-6014', 'csv', 'Mayuree Tan', 'mayuree@example.com', '0914041500', 'Rayong', '2026-04-08', 3180, 'Salon value pack'),

  order('SHP-1221', 'shopee', 'Warit N', '', '0873318801', 'Nakhon Pathom', '2026-02-18', 650, 'Sample box'),
  order('IG-2239', 'instagram', 'Benjamas R', 'ben@example.com', '0845500190', 'Surat Thani', '2025-10-09', 1780, 'Fragrance set'),
  order('TT-4901', 'tiktok', 'Tida K', 'tida@example.com', '0928807733', 'Udon Thani', '2026-03-22', 1120, 'Lip care set'),
]

export const demoDataset: IntelligenceDataset = orders.reduce<IntelligenceDataset>(
  (dataset, nextOrder) => {
    const match = resolveCustomerIdentity(dataset.customers, nextOrder)
    const customer = match
      ? mergeOrderIntoCustomer(match.customer, nextOrder, dataset.vipThreshold)
      : createCustomerFromOrder(nextOrder, dataset.vipThreshold)

    return {
      ...dataset,
      customers: match
        ? dataset.customers.map((item) => (item.id === customer.id ? customer : item))
        : [...dataset.customers, customer],
    }
  },
  {
    customers: [],
    orders: [],
    imports: [
      {
        id: 'demo-import',
        fileName: 'demo-thai-multichannel-orders.csv',
        sourceChannel: 'csv',
        importStatus: 'completed',
        totalRows: orders.length,
        importedRows: orders.length,
        createdAt: '2026-05-01T00:00:00.000Z',
      },
    ],
    vipThreshold: defaultVipThreshold,
  } satisfies IntelligenceDataset,
)

demoDataset.customers = demoDataset.customers.map((customer, customerIndex) => {
  const customerId = `demo-customer-${customerIndex + 1}`

  return {
    ...customer,
    id: customerId,
    orders: customer.orders.map((customerOrder, orderIndex) => ({
      ...customerOrder,
      id: customerOrder.externalOrderId || `${customerId}-order-${orderIndex + 1}`,
      customerProfileId: customerId,
    })),
  }
})
demoDataset.orders = demoDataset.customers.flatMap((customer) => customer.orders)

function order(
  externalOrderId: string,
  sourceChannel: OrderInput['sourceChannel'],
  customerNameRaw: string,
  emailRaw: string,
  phoneRaw: string,
  provinceRaw: string,
  orderDate: string,
  totalAmount: number,
  productName: string,
): OrderInput {
  return {
    externalOrderId,
    sourceChannel,
    customerNameRaw,
    emailRaw,
    phoneRaw,
    provinceRaw,
    orderDate: new Date(orderDate).toISOString(),
    totalAmount,
    items: [{ productName, quantity: 1, unitPrice: totalAmount }],
  }
}
