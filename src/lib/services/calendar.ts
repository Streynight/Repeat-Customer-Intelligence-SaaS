import type { CustomerProfile, CustomerStatus, IntelligenceDataset, SourceChannel } from '@/lib/types'

export type CalendarOrderInsight = {
  id: string
  customerProfileId: string
  customerName: string
  sourceChannel: SourceChannel
  orderDate: string
  totalAmount: number
  isRepeatOrder: boolean
}

export type CalendarCustomerReminder = {
  customerId: string
  customerName: string
  customerStatus: CustomerStatus
  dueDate: string
  lastOrderDate: string
  totalOrders: number
  totalSpent: number
  priority: 'follow-up' | 'win-back'
}

export type CalendarChannelBreakdown = {
  channel: SourceChannel
  orders: number
  repeatOrders: number
  revenue: number
  repeatRevenue: number
}

export type CalendarRepeatCustomer = {
  customerId: string
  customerName: string
  repeatOrders: number
  repeatRevenue: number
  sourceChannels: SourceChannel[]
}

export type CalendarDayInsight = {
  date: string
  dayOfMonth: number
  isCurrentMonth: boolean
  orders: CalendarOrderInsight[]
  repeatCustomers: CalendarRepeatCustomer[]
  reminders: CalendarCustomerReminder[]
  orderCount: number
  repeatOrderCount: number
  revenue: number
  repeatRevenue: number
  topChannel?: SourceChannel
  channelBreakdown: CalendarChannelBreakdown[]
}

export type CalendarMonthInsight = {
  month: string
  days: CalendarDayInsight[]
  weeks: CalendarDayInsight[][]
}

export function getDefaultCalendarMonth(dataset: IntelligenceDataset) {
  const latestOrder = dataset.orders
    .map((order) => order.orderDate)
    .sort((a, b) => b.localeCompare(a))[0]

  return latestOrder ? latestOrder.slice(0, 7) : new Date().toISOString().slice(0, 7)
}

export function buildCalendarMonth(dataset: IntelligenceDataset, month: string): CalendarMonthInsight {
  const [year, monthIndex] = parseMonth(month)
  const firstOfMonth = new Date(Date.UTC(year, monthIndex, 1))
  const gridStart = addDays(firstOfMonth, -firstOfMonth.getUTCDay())
  const repeatOrderIds = repeatOrderIdSet(dataset.customers)
  const customerNames = new Map(dataset.customers.map((customer) => [customer.id, customer.fullName]))
  const ordersByDate = new Map<string, CalendarOrderInsight[]>()
  const remindersByDate = new Map<string, CalendarCustomerReminder[]>()

  dataset.orders.forEach((order) => {
    const date = dateKey(order.orderDate)
    const orders = ordersByDate.get(date) ?? []

    orders.push({
      id: order.id,
      customerProfileId: order.customerProfileId,
      customerName: customerNames.get(order.customerProfileId) ?? order.customerNameRaw,
      sourceChannel: order.sourceChannel,
      orderDate: order.orderDate,
      totalAmount: order.totalAmount,
      isRepeatOrder: repeatOrderIds.has(order.id),
    })
    ordersByDate.set(date, orders)
  })

  dataset.customers.forEach((customer) => {
    if (!customer.lastOrderDate) return

    const dueDate = dateKey(addDays(new Date(customer.lastOrderDate), 30).toISOString())
    const reminders = remindersByDate.get(dueDate) ?? []

    reminders.push({
      customerId: customer.id,
      customerName: customer.fullName,
      customerStatus: customer.customerStatus,
      dueDate,
      lastOrderDate: customer.lastOrderDate,
      totalOrders: customer.totalOrders,
      totalSpent: customer.totalSpent,
      priority: customer.customerStatus === 'AtRisk' || customer.customerStatus === 'Lost' ? 'win-back' : 'follow-up',
    })
    remindersByDate.set(dueDate, reminders)
  })

  const days = Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index)
    const key = dateKey(date.toISOString())
    const orders = ordersByDate.get(key) ?? []
    const reminders = remindersByDate.get(key) ?? []
    const channelBreakdown = buildChannelBreakdown(orders)
    const repeatCustomers = buildRepeatCustomers(orders)

    return {
      date: key,
      dayOfMonth: date.getUTCDate(),
      isCurrentMonth: date.getUTCFullYear() === year && date.getUTCMonth() === monthIndex,
      orders,
      repeatCustomers,
      reminders,
      orderCount: orders.length,
      repeatOrderCount: orders.filter((order) => order.isRepeatOrder).length,
      revenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
      repeatRevenue: orders.reduce((sum, order) => sum + (order.isRepeatOrder ? order.totalAmount : 0), 0),
      topChannel: channelBreakdown[0]?.channel,
      channelBreakdown,
    } satisfies CalendarDayInsight
  })

  return {
    month,
    days,
    weeks: chunk(days, 7),
  }
}

function buildChannelBreakdown(orders: CalendarOrderInsight[]) {
  const totals = new Map<SourceChannel, CalendarChannelBreakdown>()

  orders.forEach((order) => {
    const current = totals.get(order.sourceChannel) ?? {
      channel: order.sourceChannel,
      orders: 0,
      repeatOrders: 0,
      revenue: 0,
      repeatRevenue: 0,
    }

    current.orders += 1
    current.revenue += order.totalAmount
    if (order.isRepeatOrder) {
      current.repeatOrders += 1
      current.repeatRevenue += order.totalAmount
    }
    totals.set(order.sourceChannel, current)
  })

  return Array.from(totals.values()).sort((a, b) => b.repeatRevenue - a.repeatRevenue || b.revenue - a.revenue)
}

function buildRepeatCustomers(orders: CalendarOrderInsight[]) {
  const totals = new Map<string, CalendarRepeatCustomer>()

  orders.filter((order) => order.isRepeatOrder).forEach((order) => {
    const current = totals.get(order.customerProfileId) ?? {
      customerId: order.customerProfileId,
      customerName: order.customerName,
      repeatOrders: 0,
      repeatRevenue: 0,
      sourceChannels: [],
    }

    current.repeatOrders += 1
    current.repeatRevenue += order.totalAmount
    if (!current.sourceChannels.includes(order.sourceChannel)) {
      current.sourceChannels.push(order.sourceChannel)
    }
    totals.set(order.customerProfileId, current)
  })

  return Array.from(totals.values()).sort((a, b) => {
    return b.repeatRevenue - a.repeatRevenue || a.customerName.localeCompare(b.customerName)
  })
}

function repeatOrderIdSet(customers: CustomerProfile[]) {
  const ids = new Set<string>()

  customers.forEach((customer) => {
    const sortedOrders = [...customer.orders].sort((a, b) => a.orderDate.localeCompare(b.orderDate))
    sortedOrders.slice(1).forEach((order) => ids.add(order.id))
  })

  return ids
}

function parseMonth(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)

  return [year, monthNumber - 1] as const
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function dateKey(value: string) {
  return new Date(value).toISOString().slice(0, 10)
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}
