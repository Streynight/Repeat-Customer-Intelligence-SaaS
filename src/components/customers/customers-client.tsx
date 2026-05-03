'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useMemo } from 'react'
import { ArrowUpRight, Download, Search, UploadCloud, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TreeEmptyState } from '@/components/ui/tree-surfaces'
import {
  applyCustomerFilters,
  buildCustomersHref,
  describeCustomerFilter,
  parseCustomerFilters,
  sortLabels,
  type CustomerFilterState,
  type CustomerSort,
} from '@/lib/services/customer-filters'
import { downloadCsv, exportCustomersCsv } from '@/lib/services/export'
import { rfmSegments, type RfmSegment } from '@/lib/services/retention-analytics'
import { useIntelligenceDataset } from '@/components/hooks/use-intelligence-dataset'
import { channelLabels, sourceChannels, type CustomerStatus, type SourceChannel } from '@/lib/types'
import { money } from '@/lib/utils'

export function CustomersClient() {
  const { dataset, loading } = useIntelligenceDataset()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const filters = useMemo(() => parseCustomerFilters(new URLSearchParams(searchParams.toString())), [searchParams])
  const filteredCustomers = useMemo(() => applyCustomerFilters(dataset.customers, filters), [dataset.customers, filters])
  const activeFilterEntries = activeFilters(filters)

  const updateFilters = (patch: CustomerFilterState) => {
    router.push(buildCustomersHref({ ...filters, ...patch }))
  }

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const search = String(formData.get('search') ?? '').trim()
    const product = String(formData.get('product') ?? '').trim()
    updateFilters({ search: search || undefined, product: product || undefined })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading customers</CardTitle>
          <CardDescription>Checking your workspace before showing customer profiles.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (dataset.customers.length === 0) {
    return <EmptyCustomers />
  }

  const repeatCount = dataset.customers.filter((customer) => customer.customerStatus === 'Repeat').length
  const vipCount = dataset.customers.filter((customer) => customer.customerStatus === 'VIP').length
  const atRiskCount = dataset.customers.filter((customer) => customer.customerStatus === 'AtRisk' || customer.customerStatus === 'Lost').length

  const exportFiltered = () => {
    downloadCsv('filtered-customers.csv', exportCustomersCsv(filteredCustomers))
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <SegmentTile label="Repeat" value={repeatCount} tone="repeat" href={buildCustomersHref({ segment: 'repeat', sort: 'repeatRevenue' })} />
        <SegmentTile label="VIP" value={vipCount} tone="vip" href={buildCustomersHref({ status: 'VIP', sort: 'totalSpent' })} />
        <SegmentTile label="Win-back" value={atRiskCount} tone="risk" href={buildCustomersHref({ segment: 'winback', sort: 'lastOrder' })} />
      </div>

      <CustomerExplorerControls
        filters={filters}
        resultCount={filteredCustomers.length}
        totalCount={dataset.customers.length}
        activeFilterEntries={activeFilterEntries}
        onClearAll={() => router.push(pathname)}
        onExport={exportFiltered}
        onRemoveFilter={(key) => updateFilters({ [key]: undefined })}
        onSubmitSearch={submitSearch}
        onUpdateFilters={updateFilters}
      />

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Unified customer profiles</CardTitle>
            <CardDescription>
              Showing {filteredCustomers.length} of {dataset.customers.length} customers from the active explorer filters.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Total spent</TableHead>
                <TableHead>First channel</TableHead>
                <TableHead>Last channel</TableHead>
                <TableHead>Repeat path</TableHead>
                <TableHead>Last order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id} className={statusRowClass(customer.customerStatus)}>
                    <TableCell>
                      <Link href={`/customers/${customer.id}`} className="font-bold text-primary hover:underline">{customer.fullName}</Link>
                      <p className="text-xs text-muted-foreground">{customer.email || customer.phone}</p>
                    </TableCell>
                    <TableCell><StatusPill status={customer.customerStatus} /></TableCell>
                    <TableCell>{customer.totalOrders}</TableCell>
                    <TableCell>{money(customer.totalSpent)}</TableCell>
                    <TableCell>{channelLabels[customer.firstChannel]}</TableCell>
                    <TableCell>{channelLabels[customer.lastChannel]}</TableCell>
                    <TableCell>
                      <Link
                        href={buildCustomersHref({ firstChannel: customer.firstChannel, lastChannel: customer.lastChannel })}
                        className="font-semibold text-muted-foreground hover:text-primary hover:underline"
                      >
                        {channelLabels[customer.firstChannel]} {'->'} {channelLabels[customer.lastChannel]}
                      </Link>
                    </TableCell>
                    <TableCell>{customer.lastOrderDate.slice(0, 10)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-muted-foreground">
                    No customers match these filters. Clear filters or import more orders.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function CustomerExplorerControls({
  filters,
  resultCount,
  totalCount,
  activeFilterEntries,
  onClearAll,
  onExport,
  onRemoveFilter,
  onSubmitSearch,
  onUpdateFilters,
}: {
  filters: CustomerFilterState
  resultCount: number
  totalCount: number
  activeFilterEntries: Array<[keyof CustomerFilterState, string]>
  onClearAll: () => void
  onExport: () => void
  onRemoveFilter: (key: keyof CustomerFilterState) => void
  onSubmitSearch: (event: FormEvent<HTMLFormElement>) => void
  onUpdateFilters: (patch: CustomerFilterState) => void
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle>Customer explorer</CardTitle>
          <CardDescription>Search, filter, and export the exact buyer group behind each dashboard insight.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onExport}>
            <Download size={15} />
            Export filtered
          </Button>
          {activeFilterEntries.length > 0 ? (
            <Button variant="ghost" onClick={onClearAll}>
              <X size={15} />
              Clear
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="flex flex-col gap-2 md:flex-row" onSubmit={onSubmitSearch}>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted-foreground" />
            <Input
              key={filters.search ?? 'empty-search'}
              name="search"
              className="pl-8"
              defaultValue={filters.search ?? ''}
              placeholder="Search name, email, or phone"
            />
          </div>
          <Input
            key={filters.product ?? 'empty-product'}
            name="product"
            defaultValue={filters.product ?? ''}
            placeholder="Product bought"
            className="md:max-w-56"
          />
          <Button type="submit" variant="outline">Apply</Button>
        </form>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-7">
          <FilterSelect
            label="Segment"
            value={filters.segment ?? 'all'}
            onValueChange={(value) => onUpdateFilters({ segment: value === 'all' ? undefined : value as CustomerFilterState['segment'] })}
            options={[
              ['all', 'All segments'],
              ['repeat', 'Repeat buyers'],
              ['winback', 'Win-back'],
            ]}
          />
          <FilterSelect
            label="Status"
            value={filters.status ?? 'all'}
            onValueChange={(value) => onUpdateFilters({ status: value === 'all' ? undefined : value as CustomerStatus })}
            options={[
              ['all', 'All statuses'],
              ['New', 'New'],
              ['Repeat', 'Repeat'],
              ['VIP', 'VIP'],
              ['AtRisk', 'At Risk'],
              ['Lost', 'Lost'],
            ]}
          />
          <ChannelSelect label="First channel" value={filters.firstChannel} onChange={(value) => onUpdateFilters({ firstChannel: value })} />
          <ChannelSelect label="Last channel" value={filters.lastChannel} onChange={(value) => onUpdateFilters({ lastChannel: value })} />
          <ChannelSelect label="Repeat channel" value={filters.repeatChannel} onChange={(value) => onUpdateFilters({ repeatChannel: value })} />
          <FilterSelect
            label="RFM"
            value={filters.rfmSegment ?? 'all'}
            onValueChange={(value) => onUpdateFilters({ rfmSegment: value === 'all' ? undefined : value as RfmSegment })}
            options={[
              ['all', 'All RFM'],
              ...rfmSegments.map((segment) => [segment, segment] as [string, string]),
            ]}
          />
          <FilterSelect
            label="Sort"
            value={filters.sort ?? 'totalSpent'}
            onValueChange={(value) => onUpdateFilters({ sort: value as CustomerSort })}
            options={(Object.keys(sortLabels) as CustomerSort[]).map((sort) => [sort, sortLabels[sort]])}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{resultCount}/{totalCount} customers</Badge>
          {activeFilterEntries.map(([key, value]) => (
            <button
              key={key}
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
              onClick={() => onRemoveFilter(key)}
            >
              {describeCustomerFilter(key, value)}
              <X size={12} />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string
  value: string
  options: Array<[string, string]>
  onValueChange: (value: string) => void
}) {
  return (
    <label className="grid gap-1 text-xs font-black uppercase text-muted-foreground">
      {label}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, optionLabel]) => (
            <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}

function ChannelSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value?: SourceChannel
  onChange: (value?: SourceChannel) => void
}) {
  return (
    <FilterSelect
      label={label}
      value={value ?? 'all'}
      onValueChange={(nextValue) => onChange(nextValue === 'all' ? undefined : nextValue as SourceChannel)}
      options={[
        ['all', 'All channels'],
        ...sourceChannels.map((channel) => [channel, channelLabels[channel]] as [string, string]),
      ]}
    />
  )
}

export function CustomerDetailClient({ id }: { id: string }) {
  const { dataset, loading } = useIntelligenceDataset()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading customer profile</CardTitle>
          <CardDescription>Checking the latest store data.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const customer = dataset.customers.find((item) => item.id === id)

  if (!customer) return <Card>No customer found.</Card>

  const channels = Array.from(new Set(customer.orders.map((order) => order.sourceChannel)))
  const identitySignals = identitySignal(customer)
  const statusReason = customerStatusReason(customer, dataset.vipThreshold)

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl font-black">{customer.fullName}</CardTitle>
                <CardDescription>{customer.email || customer.phone || 'Merged ecommerce buyer'}</CardDescription>
              </div>
              <StatusPill status={customer.customerStatus} />
            </div>
          </CardHeader>
          <CardContent>
          <p className={`rounded-lg p-3 text-sm font-semibold leading-6 ${statusReasonClass(customer.customerStatus)}`}>{statusReason}</p>
          <div className="mt-4 space-y-3 text-sm">
            <Field label="Status" value={customer.customerStatus} />
            <Field label="Email" value={customer.email || '-'} />
            <Field label="Phone" value={customer.phone || '-'} />
            <Field label="Province" value={customer.province || '-'} />
            <Field label="First channel" value={channelLabels[customer.firstChannel]} />
            <Field label="Last channel" value={channelLabels[customer.lastChannel]} />
            <Field label="Total orders" value={String(customer.totalOrders)} />
            <Field label="Total spent" value={money(customer.totalSpent)} />
          </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Merged identity</CardTitle>
            <CardDescription>{identitySignals}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {channels.map((channel) => (
              <Badge key={channel} variant="secondary">{channelLabels[channel]}</Badge>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Channel journey</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <JourneyStep label="First purchase" value={channelLabels[customer.firstChannel]} />
            <JourneyStep label="Latest repeat" value={channelLabels[customer.lastChannel]} />
          </CardContent>
        </Card>
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Order timeline</CardTitle>
            <CardDescription>Every known purchase tied to this profile.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {customer.orders.map((order) => (
              <div key={order.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-bold">{channelLabels[order.sourceChannel]} - {order.externalOrderId}</p>
                    <p className="text-sm text-muted-foreground">{order.orderDate.slice(0, 10)}</p>
                  </div>
                  <strong>{money(order.totalAmount)}</strong>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {order.items.map((item) => (
                    <Badge key={`${order.id}-${item.productName}`} variant="outline">{item.productName} x{item.quantity}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function EmptyCustomers() {
  return (
    <TreeEmptyState
      title="No customers yet"
      description="Your account starts clean. Import orders to create merged customer profiles, repeat segments, VIP buyers, and win-back lists."
      action={{ href: '/imports', label: 'Import orders', icon: <UploadCloud size={16} /> }}
    />
  )
}

function StatusPill({ status }: { status: CustomerStatus }) {
  const className = {
    New: 'border-border bg-secondary text-secondary-foreground',
    Repeat: 'border-emerald-300 bg-emerald-100 text-emerald-900',
    VIP: 'border-yellow-300 bg-yellow-100 text-yellow-900',
    AtRisk: 'border-amber-300 bg-amber-100 text-amber-900',
    Lost: 'border-red-300 bg-red-100 text-red-900',
  }[status] ?? 'border-border bg-secondary text-secondary-foreground'

  return <Badge variant="outline" className={className}>{status}</Badge>
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2">
      <span className="text-muted-foreground">{label}</span>
      <strong className="text-right">{value}</strong>
    </div>
  )
}

function JourneyStep({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/25 p-3">
      <p className="text-xs font-black uppercase text-muted-foreground">{label}</p>
      <Separator className="my-2" />
      <strong className="mt-1 block">{value}</strong>
    </div>
  )
}

function SegmentTile({
  label,
  value,
  tone,
  href,
}: {
  label: string
  value: number
  tone: 'repeat' | 'vip' | 'risk'
  href: string
}) {
  const className = {
    repeat: 'border-emerald-200 bg-emerald-50/75 text-emerald-950',
    vip: 'border-yellow-200 bg-yellow-50/80 text-yellow-950',
    risk: 'border-amber-200 bg-amber-50/80 text-amber-950',
  }[tone]

  return (
    <Link href={href} className={`tree-tactile group rounded-xl border p-4 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45 ${className}`}>
      <p className="text-xs font-black uppercase opacity-75">{label}</p>
      <span className="mt-2 flex items-end justify-between gap-3">
        <strong className="block text-3xl font-black tracking-tight">{value}</strong>
        <ArrowUpRight className="size-4 opacity-55 group-hover:opacity-100" />
      </span>
    </Link>
  )
}

function statusRowClass(status: CustomerStatus) {
  if (status === 'Repeat') return 'bg-emerald-50/35'
  if (status === 'VIP') return 'bg-yellow-50/35'
  if (status === 'AtRisk' || status === 'Lost') return 'bg-amber-50/35'
  return ''
}

function activeFilters(filters: CustomerFilterState) {
  return (['segment', 'status', 'firstChannel', 'lastChannel', 'repeatChannel', 'rfmSegment', 'product', 'search', 'sort'] as const)
    .flatMap((key) => filters[key] ? [[key, String(filters[key])]] as Array<[keyof CustomerFilterState, string]> : [])
}

function statusReasonClass(status: CustomerStatus) {
  if (status === 'Repeat') return 'bg-emerald-50 text-emerald-900'
  if (status === 'VIP') return 'bg-yellow-50 text-yellow-900'
  if (status === 'AtRisk' || status === 'Lost') return 'bg-amber-50 text-amber-900'
  return 'bg-secondary text-secondary-foreground'
}

function identitySignal(customer: ReturnType<typeof useIntelligenceDataset>['dataset']['customers'][number]) {
  const signals = []
  if (customer.phone) signals.push('phone exact match')
  if (customer.email) signals.push('email exact match')
  if (customer.lineId) signals.push('LINE ID exact match')

  const channelCount = new Set(customer.orders.map((order) => order.sourceChannel)).size

  if (channelCount > 1) {
    return `Orders from ${channelCount} channels were unified using ${signals.join(', ') || 'fuzzy name matching'}.`
  }

  return `Single-channel profile. Future imports will merge into this buyer when ${signals.join(' or ') || 'name similarity'} matches.`
}

function customerStatusReason(
  customer: ReturnType<typeof useIntelligenceDataset>['dataset']['customers'][number],
  vipThreshold: number,
) {
  const daysSinceLastOrder = Math.floor((Date.now() - new Date(customer.lastOrderDate).getTime()) / 86_400_000)

  if (customer.customerStatus === 'VIP') {
    return `VIP because they placed ${customer.totalOrders} orders and spent ${money(customer.totalSpent)}, above the ${money(vipThreshold)} VIP threshold.`
  }

  if (customer.customerStatus === 'AtRisk') {
    return `At Risk because their last purchase was ${daysSinceLastOrder} days ago. Export them for a win-back campaign.`
  }

  if (customer.customerStatus === 'Lost') {
    return `Lost because their last purchase was ${daysSinceLastOrder} days ago. Use this profile for reactivation targeting.`
  }

  if (customer.customerStatus === 'Repeat') {
    return `Repeat buyer because they purchased ${customer.totalOrders} times across ${new Set(customer.orders.map((order) => order.sourceChannel)).size} channel(s).`
  }

  return 'New buyer with one known order. Watch whether they return through the same or a different channel.'
}
