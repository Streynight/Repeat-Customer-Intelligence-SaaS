export type SourceChannel = 'shopee' | 'tiktok' | 'lazada' | 'instagram' | 'facebook' | 'website' | 'csv'

export type CustomerStatus = 'New' | 'Repeat' | 'VIP' | 'AtRisk' | 'Lost'

export type OrderItemInput = {
  sku?: string
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
  taxAmount?: number
  discountAmount?: number
  shippingAmount?: number
  platformFeeAmount?: number
  refundAmount?: number
  taxRate?: number
  taxIncluded?: boolean
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

export type FinanceSettings = {
  taxCountry: string
  taxLabel: string
  taxRate: number
  taxIncluded: boolean
}

export type IncomeSummary = {
  grossIncome: number
  netIncome: number
  taxAmount: number
  explicitTaxAmount: number
  estimatedTaxAmount: number
  discountAmount: number
  shippingAmount: number
  platformFeeAmount: number
  refundAmount: number
  orderCount: number
  averageOrderValue: number
}

export type MonthlyIncomeRow = IncomeSummary & {
  month: string
}

export type VatSummaryRow = {
  month: string
  grossIncome: number
  explicitVat: number
  estimatedVat: number
  totalVat: number
  netBeforeVat: number
  orderCount: number
}

export type ChannelIncomeRow = IncomeSummary & {
  channel: SourceChannel
}

export type CsvSyncConnectionState = {
  id: string
  name: string
  csvUrl: string
  sourceChannel: SourceChannel
  columnMapping: Record<string, string>
  enabled: boolean
  intervalMinutes: number
  lastSyncStatus?: 'success' | 'failed' | 'skipped'
  lastSyncError?: string
  lastSyncedAt?: string
  createdAt: string
}

export type CsvSyncRunResult = {
  connectionId: string
  status: 'success' | 'failed' | 'skipped'
  totalRows: number
  importedRows: number
  errorMessage?: string
  startedAt: string
  finishedAt?: string
}

export const sourceChannels: SourceChannel[] = [
  'shopee',
  'tiktok',
  'lazada',
  'instagram',
  'facebook',
  'website',
  'csv',
]

export const channelLabels: Record<SourceChannel, string> = {
  shopee: 'Shopee',
  tiktok: 'TikTok Shop',
  lazada: 'Lazada',
  instagram: 'Instagram',
  facebook: 'Facebook',
  website: 'Website',
  csv: 'Custom CSV',
}
