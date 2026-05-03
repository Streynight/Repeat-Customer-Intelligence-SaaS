export type SourceChannel = 'shopee' | 'tiktok' | 'instagram' | 'facebook' | 'website' | 'csv'

export type CustomerStatus = 'New' | 'Repeat' | 'VIP' | 'AtRisk' | 'Lost'

export type OrderItemInput = {
  productName: string
  quantity: number
  unitPrice: number
}

export type OrderInput = {
  externalOrderId: string
  sourceChannel: SourceChannel
  customerNameRaw: string
  emailRaw?: string
  phoneRaw?: string
  lineIdRaw?: string
  provinceRaw?: string
  orderDate: string
  totalAmount: number
  items: OrderItemInput[]
}

export type CustomerProfile = {
  id: string
  fullName: string
  email?: string
  phone?: string
  lineId?: string
  province?: string
  firstChannel: SourceChannel
  lastChannel: SourceChannel
  totalOrders: number
  totalSpent: number
  firstOrderDate: string
  lastOrderDate: string
  customerStatus: CustomerStatus
  orders: OrderRecord[]
}

export type OrderRecord = OrderInput & {
  id: string
  customerProfileId: string
}

export type ImportRecord = {
  id: string
  fileName: string
  sourceChannel: SourceChannel
  importStatus: 'pending' | 'processing' | 'completed' | 'failed'
  totalRows: number
  importedRows: number
  createdAt: string
}

export type IntelligenceDataset = {
  customers: CustomerProfile[]
  orders: OrderRecord[]
  imports: ImportRecord[]
  vipThreshold: number
}

export const sourceChannels: SourceChannel[] = [
  'shopee',
  'tiktok',
  'instagram',
  'facebook',
  'website',
  'csv',
]

export const channelLabels: Record<SourceChannel, string> = {
  shopee: 'Shopee',
  tiktok: 'TikTok Shop',
  instagram: 'Instagram',
  facebook: 'Facebook',
  website: 'Website',
  csv: 'Custom CSV',
}
