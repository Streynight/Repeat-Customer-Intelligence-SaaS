import { channelLabels, sourceChannels, type CustomerProfile, type CustomerStatus, type SourceChannel } from '@/lib/types'

export type CustomerSegment = 'repeat' | 'winback'
export type CustomerSort = 'totalSpent' | 'lastOrder' | 'totalOrders' | 'repeatRevenue' | 'name'

export type CustomerFilterState = {
  segment?: CustomerSegment
  status?: CustomerStatus
  firstChannel?: SourceChannel
  lastChannel?: SourceChannel
  repeatChannel?: SourceChannel
  search?: string
  sort?: CustomerSort
}

const customerStatuses: CustomerStatus[] = ['New', 'Repeat', 'VIP', 'AtRisk', 'Lost']
const customerSegments: CustomerSegment[] = ['repeat', 'winback']
const customerSorts: CustomerSort[] = ['totalSpent', 'lastOrder', 'totalOrders', 'repeatRevenue', 'name']

export function parseCustomerFilters(searchParams: URLSearchParams): CustomerFilterState {
  const filters: CustomerFilterState = {}
  const segment = searchParams.get('segment')
  const status = searchParams.get('status')
  const firstChannel = searchParams.get('firstChannel')
  const lastChannel = searchParams.get('lastChannel')
  const repeatChannel = searchParams.get('repeatChannel')
  const sort = searchParams.get('sort')
  const search = searchParams.get('search')?.trim()

  if (isCustomerSegment(segment)) filters.segment = segment
  if (isCustomerStatus(status)) filters.status = status
  if (isSourceChannel(firstChannel)) filters.firstChannel = firstChannel
  if (isSourceChannel(lastChannel)) filters.lastChannel = lastChannel
  if (isSourceChannel(repeatChannel)) filters.repeatChannel = repeatChannel
  if (isCustomerSort(sort)) filters.sort = sort
  if (search) filters.search = search

  return filters
}

export function filterCustomers(customers: CustomerProfile[], filters: CustomerFilterState) {
  return customers.filter((customer) => {
    if (filters.segment === 'repeat' && customer.totalOrders < 2) return false
    if (filters.segment === 'winback' && customer.customerStatus !== 'AtRisk' && customer.customerStatus !== 'Lost') return false
    if (filters.status && customer.customerStatus !== filters.status) return false
    if (filters.firstChannel && customer.firstChannel !== filters.firstChannel) return false
    if (filters.lastChannel && customer.lastChannel !== filters.lastChannel) return false
    if (filters.repeatChannel && !customerMatchesRepeatChannel(customer, filters.repeatChannel)) return false
    if (filters.search && !customerMatchesSearch(customer, filters.search)) return false

    return true
  })
}

export function sortCustomers(customers: CustomerProfile[], sort: CustomerSort = 'totalSpent') {
  return [...customers].sort((a, b) => {
    const byName = a.fullName.localeCompare(b.fullName)

    if (sort === 'name') return byName
    if (sort === 'lastOrder') return b.lastOrderDate.localeCompare(a.lastOrderDate) || byName
    if (sort === 'totalOrders') return b.totalOrders - a.totalOrders || byName
    if (sort === 'repeatRevenue') return repeatRevenueForCustomer(b) - repeatRevenueForCustomer(a) || byName

    return b.totalSpent - a.totalSpent || byName
  })
}

export function applyCustomerFilters(customers: CustomerProfile[], filters: CustomerFilterState) {
  return sortCustomers(filterCustomers(customers, filters), filters.sort)
}

export function buildCustomersHref(filters: CustomerFilterState = {}) {
  const params = new URLSearchParams()

  if (filters.segment) params.set('segment', filters.segment)
  if (filters.status) params.set('status', filters.status)
  if (filters.firstChannel) params.set('firstChannel', filters.firstChannel)
  if (filters.lastChannel) params.set('lastChannel', filters.lastChannel)
  if (filters.repeatChannel) params.set('repeatChannel', filters.repeatChannel)
  if (filters.search?.trim()) params.set('search', filters.search.trim())
  if (filters.sort) params.set('sort', filters.sort)

  const query = params.toString()
  return query ? `/customers?${query}` : '/customers'
}

export function customerMatchesRepeatChannel(customer: CustomerProfile, channel: SourceChannel) {
  const [, ...repeatOrders] = sortedOrders(customer)
  return repeatOrders.some((order) => order.sourceChannel === channel)
}

export function repeatRevenueForCustomer(customer: CustomerProfile) {
  const [, ...repeatOrders] = sortedOrders(customer)
  return repeatOrders.reduce((sum, order) => sum + order.totalAmount, 0)
}

export function describeCustomerFilter(key: keyof CustomerFilterState, value: string) {
  if (key === 'segment') return value === 'winback' ? 'Win-back' : 'Repeat buyers'
  if (key === 'status') return value
  if (key === 'firstChannel') return `First: ${channelLabels[value as SourceChannel]}`
  if (key === 'lastChannel') return `Last: ${channelLabels[value as SourceChannel]}`
  if (key === 'repeatChannel') return `Repeat channel: ${channelLabels[value as SourceChannel]}`
  if (key === 'sort') return `Sort: ${sortLabels[value as CustomerSort]}`
  return `Search: ${value}`
}

export const sortLabels: Record<CustomerSort, string> = {
  totalSpent: 'Total spent',
  lastOrder: 'Last order',
  totalOrders: 'Total orders',
  repeatRevenue: 'Repeat revenue',
  name: 'Name',
}

function customerMatchesSearch(customer: CustomerProfile, query: string) {
  const normalized = query.trim().toLowerCase()
  const haystack = [customer.fullName, customer.email, customer.phone]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(normalized)
}

function sortedOrders(customer: CustomerProfile) {
  return [...customer.orders].sort((a, b) => a.orderDate.localeCompare(b.orderDate))
}

function isSourceChannel(value: string | null): value is SourceChannel {
  return Boolean(value && sourceChannels.includes(value as SourceChannel))
}

function isCustomerStatus(value: string | null): value is CustomerStatus {
  return Boolean(value && customerStatuses.includes(value as CustomerStatus))
}

function isCustomerSegment(value: string | null): value is CustomerSegment {
  return Boolean(value && customerSegments.includes(value as CustomerSegment))
}

function isCustomerSort(value: string | null): value is CustomerSort {
  return Boolean(value && customerSorts.includes(value as CustomerSort))
}
