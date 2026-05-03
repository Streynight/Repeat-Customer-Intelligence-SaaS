import type { CustomerProfile, CustomerStatus } from '@/lib/types'

export function exportCustomersCsv(customers: CustomerProfile[], status?: CustomerStatus) {
  const rows = status ? customers.filter((customer) => customer.customerStatus === status) : customers
  const header = ['name', 'email', 'phone', 'province', 'status', 'total_orders', 'total_spent', 'first_channel', 'last_channel']
  const lines = rows.map((customer) =>
    [
      customer.fullName,
      customer.email ?? '',
      customer.phone ?? '',
      customer.province ?? '',
      customer.customerStatus,
      customer.totalOrders,
      customer.totalSpent,
      customer.firstChannel,
      customer.lastChannel,
    ].map(escapeCsv).join(','),
  )

  return [header.join(','), ...lines].join('\n')
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function escapeCsv(value: string | number) {
  const text = String(value)
  return text.includes(',') || text.includes('"') ? `"${text.replaceAll('"', '""')}"` : text
}
