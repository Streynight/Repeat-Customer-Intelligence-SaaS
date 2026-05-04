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
  parseCustomerFilters,
  sortLabels,
  type CustomerFilterState,
  type CustomerSort,
} from '@/lib/services/customer-filters'
import { downloadCsv, exportCustomersCsv } from '@/lib/services/export'
import { rfmSegments, type RfmSegment } from '@/lib/services/retention-analytics'
import { useIntelligenceDataset } from '@/components/hooks/use-intelligence-dataset'
import { channelLabels, sourceChannels, type CustomerStatus, type SourceChannel } from '@/lib/types'
import { useText } from '@/lib/i18n'
import { money } from '@/lib/utils'

export function CustomersClient() {
  const { dataset, loading } = useIntelligenceDataset()
  const t = useText()
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
          <CardTitle>{t('Loading customers')}</CardTitle>
          <CardDescription>{t('Checking your workspace before showing customer profiles.')}</CardDescription>
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
            <CardTitle>{t('Unified customer profiles')}</CardTitle>
            <CardDescription>
              {t('Showing')} {filteredCustomers.length} {t('of')} {dataset.customers.length} {t('customers from the active explorer filters.')}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Customer')}</TableHead>
                <TableHead>{t('Status')}</TableHead>
                <TableHead>{t('Orders')}</TableHead>
                <TableHead>{t('Total spent')}</TableHead>
                <TableHead>{t('First channel')}</TableHead>
                <TableHead>{t('Last channel')}</TableHead>
                <TableHead>{t('Repeat path')}</TableHead>
                <TableHead>{t('Last order')}</TableHead>
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
                    <TableCell>{t(channelLabels[customer.firstChannel])}</TableCell>
                    <TableCell>{t(channelLabels[customer.lastChannel])}</TableCell>
                    <TableCell>
                      <Link
                        href={buildCustomersHref({ firstChannel: customer.firstChannel, lastChannel: customer.lastChannel })}
                        className="font-semibold text-muted-foreground hover:text-primary hover:underline"
                      >
                        {t(channelLabels[customer.firstChannel])} {'->'} {t(channelLabels[customer.lastChannel])}
                      </Link>
                    </TableCell>
                    <TableCell>{customer.lastOrderDate.slice(0, 10)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-muted-foreground">
                    {t('No customers match these filters. Clear filters or import more orders.')}
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
  const t = useText()

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle>{t('Customer explorer')}</CardTitle>
          <CardDescription>{t('Search, filter, and export the exact buyer group behind each dashboard insight.')}</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onExport}>
            <Download size={15} />
            {t('Export filtered')}
          </Button>
          {activeFilterEntries.length > 0 ? (
            <Button variant="ghost" onClick={onClearAll}>
              <X size={15} />
              {t('Clear')}
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
              placeholder={t('Search name, email, or phone')}
            />
          </div>
          <Input
            key={filters.product ?? 'empty-product'}
            name="product"
            defaultValue={filters.product ?? ''}
            placeholder={t('Product bought')}
            className="md:max-w-56"
          />
          <Button type="submit" variant="outline">{t('Apply')}</Button>
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
          <Badge variant="secondary">{resultCount}/{totalCount} {t('customers')}</Badge>
          {activeFilterEntries.map(([key, value]) => (
            <button
              key={key}
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
              onClick={() => onRemoveFilter(key)}
            >
              {describeTranslatedCustomerFilter(key, value, t)}
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
  const t = useText()

  return (
    <label className="grid gap-1 text-xs font-black uppercase text-muted-foreground">
      {t(label)}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, optionLabel]) => (
            <SelectItem key={optionValue} value={optionValue}>{t(optionLabel)}</SelectItem>
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
  const t = useText()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('Loading customer profile')}</CardTitle>
          <CardDescription>{t('Checking the latest store data.')}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const customer = dataset.customers.find((item) => item.id === id)

  if (!customer) return <Card>{t('No customer found.')}</Card>

  const channels = Array.from(new Set(customer.orders.map((order) => order.sourceChannel)))
  const identitySignals = identitySignal(customer, t)
  const statusReason = customerStatusReason(customer, dataset.vipThreshold, t)

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl font-black">{customer.fullName}</CardTitle>
                <CardDescription>{customer.email || customer.phone || t('Merged ecommerce buyer')}</CardDescription>
              </div>
              <StatusPill status={customer.customerStatus} />
            </div>
          </CardHeader>
          <CardContent>
          <p className={`rounded-lg p-3 text-sm font-semibold leading-6 ${statusReasonClass(customer.customerStatus)}`}>{statusReason}</p>
          <div className="mt-4 space-y-3 text-sm">
            <Field label="Status" value={t(customer.customerStatus)} />
            <Field label="Email" value={customer.email || '-'} />
            <Field label="Phone" value={customer.phone || '-'} />
            <Field label="Province" value={customer.province || '-'} />
            <Field label="First channel" value={t(channelLabels[customer.firstChannel])} />
            <Field label="Last channel" value={t(channelLabels[customer.lastChannel])} />
            <Field label="Total orders" value={String(customer.totalOrders)} />
            <Field label="Total spent" value={money(customer.totalSpent)} />
          </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('Merged identity')}</CardTitle>
            <CardDescription>{identitySignals}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {channels.map((channel) => (
              <Badge key={channel} variant="secondary">{t(channelLabels[channel])}</Badge>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('Channel journey')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <JourneyStep label="First purchase" value={t(channelLabels[customer.firstChannel])} />
            <JourneyStep label="Latest repeat" value={t(channelLabels[customer.lastChannel])} />
          </CardContent>
        </Card>
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('Order timeline')}</CardTitle>
            <CardDescription>{t('Every known purchase tied to this profile.')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {customer.orders.map((order) => (
              <div key={order.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-bold">{t(channelLabels[order.sourceChannel])} - {order.externalOrderId}</p>
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
  const t = useText()

  return (
    <TreeEmptyState
      title={t('No customers yet')}
      description={t('Your account starts clean. Import orders to create merged customer profiles, repeat segments, VIP buyers, and win-back lists.')}
      action={{ href: '/imports', label: t('Import orders'), icon: <UploadCloud size={16} /> }}
    />
  )
}

function StatusPill({ status }: { status: CustomerStatus }) {
  const t = useText()
  const className = {
    New: 'border-border bg-secondary text-secondary-foreground',
    Repeat: 'border-emerald-300 bg-emerald-100 text-emerald-900',
    VIP: 'border-violet-300 bg-violet-100 text-violet-900',
    AtRisk: 'border-rose-300 bg-rose-100 text-rose-900',
    Lost: 'border-red-300 bg-red-100 text-red-900',
  }[status] ?? 'border-border bg-secondary text-secondary-foreground'

  return <Badge variant="outline" className={className}>{t(status)}</Badge>
}

function Field({ label, value }: { label: string; value: string }) {
  const t = useText()

  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2">
      <span className="text-muted-foreground">{t(label)}</span>
      <strong className="text-right">{value}</strong>
    </div>
  )
}

function JourneyStep({ label, value }: { label: string; value: string }) {
  const t = useText()

  return (
    <div className="rounded-lg border border-border bg-secondary/25 p-3">
      <p className="text-xs font-black uppercase text-muted-foreground">{t(label)}</p>
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
  const t = useText()
  const className = {
    repeat: 'border-emerald-200 bg-emerald-50/75 text-emerald-950',
    vip: 'border-violet-200 bg-violet-50/80 text-violet-950',
    risk: 'border-rose-200 bg-rose-50/80 text-rose-950',
  }[tone]

  return (
    <Link href={href} className={`tree-tactile group rounded-lg border p-4 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45 ${className}`}>
      <p className="text-xs font-black uppercase opacity-75">{t(label)}</p>
      <span className="mt-2 flex items-end justify-between gap-3">
        <strong className="block text-3xl font-black tracking-tight">{value}</strong>
        <ArrowUpRight className="size-4 opacity-55 group-hover:opacity-100" />
      </span>
    </Link>
  )
}

function statusRowClass(status: CustomerStatus) {
  if (status === 'Repeat') return 'bg-emerald-50/35'
  if (status === 'VIP') return 'bg-violet-50/35'
  if (status === 'AtRisk' || status === 'Lost') return 'bg-rose-50/35'
  return ''
}

function activeFilters(filters: CustomerFilterState) {
  return (['segment', 'status', 'firstChannel', 'lastChannel', 'repeatChannel', 'rfmSegment', 'product', 'search', 'sort'] as const)
    .flatMap((key) => filters[key] ? [[key, String(filters[key])]] as Array<[keyof CustomerFilterState, string]> : [])
}

function statusReasonClass(status: CustomerStatus) {
  if (status === 'Repeat') return 'bg-emerald-50 text-emerald-900'
  if (status === 'VIP') return 'bg-violet-50 text-violet-900'
  if (status === 'AtRisk' || status === 'Lost') return 'bg-rose-50 text-rose-900'
  return 'bg-secondary text-secondary-foreground'
}

function describeTranslatedCustomerFilter(key: keyof CustomerFilterState, value: string, t: (text: string) => string) {
  if (key === 'segment') return value === 'winback' ? t('Win-back') : t('Repeat buyers')
  if (key === 'status') return t(value)
  if (key === 'firstChannel') return `${t('First')}: ${t(channelLabels[value as SourceChannel])}`
  if (key === 'lastChannel') return `${t('Last')}: ${t(channelLabels[value as SourceChannel])}`
  if (key === 'repeatChannel') return `${t('Repeat channel')}: ${t(channelLabels[value as SourceChannel])}`
  if (key === 'rfmSegment') return `${t('RFM')}: ${t(value)}`
  if (key === 'product') return `${t('Product')}: ${value}`
  if (key === 'sort') return `${t('Sort')}: ${t(sortLabels[value as CustomerSort])}`
  return `${t('Search')}: ${value}`
}

function identitySignal(customer: ReturnType<typeof useIntelligenceDataset>['dataset']['customers'][number], t: (text: string) => string) {
  const signals = []
  if (customer.phone) signals.push(t('phone exact match'))
  if (customer.email) signals.push(t('email exact match'))
  if (customer.lineId) signals.push(t('LINE ID exact match'))

  const channelCount = new Set(customer.orders.map((order) => order.sourceChannel)).size

  if (channelCount > 1) {
    return `${t('Orders from')} ${channelCount} ${t('channels were unified using')} ${signals.join(', ') || t('fuzzy name matching')}.`
  }

  return `${t('Single-channel profile. Future imports will merge into this buyer when')} ${signals.join(` ${t('or')} `) || t('name similarity')} ${t('matches.')}`
}

function customerStatusReason(
  customer: ReturnType<typeof useIntelligenceDataset>['dataset']['customers'][number],
  vipThreshold: number,
  t: (text: string) => string,
) {
  const daysSinceLastOrder = Math.floor((Date.now() - new Date(customer.lastOrderDate).getTime()) / 86_400_000)

  if (customer.customerStatus === 'VIP') {
    return `${t('VIP because they placed')} ${customer.totalOrders} ${t('orders and spent')} ${money(customer.totalSpent)}, ${t('above the')} ${money(vipThreshold)} ${t('VIP threshold.')}`
  }

  if (customer.customerStatus === 'AtRisk') {
    return `${t('At Risk because their last purchase was')} ${daysSinceLastOrder} ${t('days ago. Export them for a win-back campaign.')}`
  }

  if (customer.customerStatus === 'Lost') {
    return `${t('Lost because their last purchase was')} ${daysSinceLastOrder} ${t('days ago. Use this profile for reactivation targeting.')}`
  }

  if (customer.customerStatus === 'Repeat') {
    return `${t('Repeat buyer because they purchased')} ${customer.totalOrders} ${t('times across')} ${new Set(customer.orders.map((order) => order.sourceChannel)).size} ${t('channel(s).')}`
  }

  return t('New buyer with one known order. Watch whether they return through the same or a different channel.')
}
