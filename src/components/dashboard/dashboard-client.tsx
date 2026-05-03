'use client'

import Link from 'next/link'
import { ArrowUpRight, CalendarDays, UploadCloud, Users } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, MetricCard } from '@/components/ui/card'
import { dashboardMetrics, customersByStatus, firstVsRepeatChannel, monthlyRepeatTrend, repeatRevenueByChannel } from '@/lib/services/attribution'
import { buildCustomersHref } from '@/lib/services/customer-filters'
import { useIntelligenceDataset } from '@/lib/use-intelligence-dataset'
import { channelLabels, type SourceChannel } from '@/lib/types'
import { money, percent } from '@/lib/utils'

const colors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

export function DashboardClient() {
  const { dataset, loading } = useIntelligenceDataset()

  if (loading) {
    return <DashboardLoading />
  }

  if (dataset.customers.length === 0 && dataset.orders.length === 0) {
    return <EmptyDashboard />
  }

  const metrics = dashboardMetrics(dataset)
  const repeatRevenue = repeatRevenueByChannel(dataset.customers)
  const statusRows = customersByStatus(dataset.customers)
  const channelPaths = firstVsRepeatChannel(dataset.customers)
  const monthlyTrend = monthlyRepeatTrend(dataset.customers)
  const bestRepeatChannel = [...repeatRevenue].sort((a, b) => b.revenue - a.revenue)[0]
  const bestRepeatPath = [...channelPaths].sort((a, b) => b.customers - a.customers)[0]
  const atRiskRevenue = atRiskCustomersValue(dataset.customers)
  const repeatCustomers = dataset.customers
    .filter((customer) => customer.totalOrders >= 2)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 6)
  const atRiskCustomers = dataset.customers
    .filter((customer) => customer.customerStatus === 'AtRisk' || customer.customerStatus === 'Lost')
    .slice(0, 6)
  const recentRepeatOrders = dataset.orders
    .filter((order) => (dataset.customers.find((customer) => customer.id === order.customerProfileId)?.totalOrders ?? 0) >= 2)
    .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-3">
        <InsightCallout
          label="Best repeat channel"
          value={bestRepeatChannel ? channelLabels[bestRepeatChannel.channel] : 'No repeats yet'}
          detail={bestRepeatChannel ? `${money(bestRepeatChannel.revenue)} in repeat revenue` : 'Import orders to see channel winners.'}
          tone="repeat"
          href={bestRepeatChannel ? buildCustomersHref({ repeatChannel: bestRepeatChannel.channel, sort: 'repeatRevenue' }) : buildCustomersHref({ segment: 'repeat' })}
        />
        <InsightCallout
          label="Top channel path"
          value={bestRepeatPath ? formatChannelPath(bestRepeatPath.path) : 'No path yet'}
          detail={bestRepeatPath ? `${bestRepeatPath.customers} customers repeated through this path` : 'Repeat customers reveal source-to-repeat movement.'}
          tone="vip"
          href={bestRepeatPath ? buildCustomersHref(channelPathFilters(bestRepeatPath.path)) : buildCustomersHref({ segment: 'repeat' })}
        />
        <InsightCallout
          label="Remarketing urgency"
          value={money(atRiskRevenue)}
          detail="Revenue sitting in At Risk or Lost customer profiles"
          tone="risk"
          href={buildCustomersHref({ segment: 'winback', sort: 'lastOrder' })}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <ActionLink href={buildCustomersHref({ segment: 'repeat', sort: 'repeatRevenue' })} title="Review repeat buyers" detail="Open the buyers driving repeated orders." />
        <ActionLink href={buildCustomersHref({ segment: 'winback', sort: 'lastOrder' })} title="Win back stale buyers" detail="Focus At Risk and Lost profiles first." />
        <ActionLink href="/imports" title="Import latest orders" detail="Refresh the dashboard with a new CSV." />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Known buyers" value={metrics.totalCustomers.toLocaleString()} href={buildCustomersHref()} />
        <MetricCard label="Bought again" value={metrics.repeatCustomers.toLocaleString()} tone="repeat" href={buildCustomersHref({ segment: 'repeat' })} />
        <MetricCard label="Repeat rate" value={percent(metrics.repeatRate)} tone="repeat" href={buildCustomersHref({ segment: 'repeat' })} />
        <MetricCard label="VIP buyers" value={metrics.vipCustomers.toLocaleString()} tone="vip" href={buildCustomersHref({ status: 'VIP' })} />
        <MetricCard label="Need win-back" value={metrics.atRiskCustomers.toLocaleString()} tone="risk" href={buildCustomersHref({ segment: 'winback' })} />
        <MetricCard label="Repeat revenue" value={money(metrics.repeatRevenue)} tone="repeat" href={buildCustomersHref({ segment: 'repeat', sort: 'repeatRevenue' })} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Repeat Revenue by Channel">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={repeatRevenue}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="channel" tickFormatter={(value) => channelLabels[value as keyof typeof channelLabels]} />
              <YAxis tickFormatter={(value) => money(Number(value))} />
              <RechartsTooltip formatter={(value) => money(Number(value))} />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                {repeatRevenue.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Monthly Repeat Trend">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => money(Number(value))} />
              <RechartsTooltip formatter={(value) => money(Number(value))} />
              <Line dataKey="revenue" stroke="var(--chart-1)" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Customers by Status">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={statusRows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="status" />
              <YAxis />
              <RechartsTooltip />
              <Bar dataKey="count" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="First Purchase vs Repeat Purchase Channel">
          <div className="grid gap-3">
            {channelPaths.map((row) => (
              <Link
                key={row.path}
                href={buildCustomersHref(channelPathFilters(row.path))}
                className="group flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2 transition hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
              >
                <span className="text-sm font-semibold text-foreground">{formatChannelPath(row.path)}</span>
                <Badge variant="secondary" className="gap-1">{row.customers}<ArrowUpRight size={12} className="opacity-55 group-hover:opacity-100" /></Badge>
              </Link>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <CustomerMiniTable title="Top Repeat Customers" customers={repeatCustomers} tone="repeat" />
        <CustomerMiniTable title="At Risk Customers" customers={atRiskCustomers} tone="risk" />
        <Card>
          <CardHeader>
            <CardTitle>Recent Repeat Orders</CardTitle>
            <CardDescription>Fresh repeat activity worth noticing.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {recentRepeatOrders.map((order) => (
              <Link
                key={order.id}
                href={`/customers/${order.customerProfileId}`}
                className="group rounded-lg border border-emerald-200/70 bg-emerald-50/55 p-3 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
              >
                <p className="text-sm font-bold">{channelLabels[order.sourceChannel]}</p>
                <p className="text-xs text-muted-foreground">{order.customerNameRaw} - {money(order.totalAmount)}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DashboardLoading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loading workspace</CardTitle>
        <CardDescription>Checking your store data before showing repeat intelligence.</CardDescription>
      </CardHeader>
    </Card>
  )
}

function EmptyDashboard() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <Card className="border-primary/15 bg-gradient-to-br from-card via-secondary/45 to-accent/25">
        <CardHeader>
          <CardTitle className="text-2xl font-black">Start with your first order import</CardTitle>
          <CardDescription className="max-w-2xl leading-6">
            This workspace is clean. Upload a CSV to create customer profiles, repeat revenue, channel paths, and follow-up timing from your own store data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="font-black">
            <Link href="/imports">
              <UploadCloud size={16} />
              Import orders
            </Link>
          </Button>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <EmptyStep icon={UploadCloud} title="Import CSV" detail="Bring in orders from Shopee, TikTok Shop, social, website, or custom exports." />
            <EmptyStep icon={Users} title="Resolve buyers" detail="Phone, email, LINE ID, and names create unified customer profiles." />
            <EmptyStep icon={CalendarDays} title="Track repeat timing" detail="Calendar and win-back views appear after the first import." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current workspace</CardTitle>
          <CardDescription>No customer, order, revenue, or import records yet.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <MetricCard label="Known buyers" value="0" />
          <MetricCard label="Repeat revenue" value={money(0)} tone="repeat" />
          <MetricCard label="Need win-back" value="0" tone="risk" />
        </CardContent>
      </Card>
    </div>
  )
}

function EmptyStep({
  icon: Icon,
  title,
  detail,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  detail: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card/75 p-4">
      <Icon size={18} className="text-primary" />
      <h3 className="mt-3 font-black">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function InsightCallout({
  label,
  value,
  detail,
  href,
  tone = 'repeat',
}: {
  label: string
  value: string
  detail: string
  href: string
  tone?: 'repeat' | 'vip' | 'risk'
}) {
  const toneClass = {
    repeat: 'border-emerald-200/80 bg-gradient-to-br from-card via-emerald-50/75 to-accent/30',
    vip: 'border-yellow-200/80 bg-gradient-to-br from-card via-yellow-50/75 to-secondary/50',
    risk: 'border-amber-200/80 bg-gradient-to-br from-card via-amber-50/80 to-orange-50/55',
  }[tone]
  const iconClass = {
    repeat: 'bg-emerald-100 text-emerald-800',
    vip: 'bg-yellow-100 text-yellow-800',
    risk: 'bg-amber-100 text-amber-800',
  }[tone]

  return (
    <Link href={href} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45">
      <Card className={`${toneClass} transition group-hover:-translate-y-0.5 group-hover:shadow-md`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-primary">{label}</p>
          <strong className="mt-3 block text-xl font-black text-foreground">{value}</strong>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
        </div>
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${iconClass}`}>
          <ArrowUpRight size={17} />
        </span>
      </div>
      </Card>
    </Link>
  )
}

function ActionLink({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <Link href={href} className="group rounded-xl border border-border bg-card/85 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black">{title}</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{detail}</p>
        </div>
        <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary" />
      </div>
    </Link>
  )
}

function CustomerMiniTable({
  title,
  customers,
  tone,
}: {
  title: string
  customers: ReturnType<typeof useIntelligenceDataset>['dataset']['customers']
  tone: 'repeat' | 'risk'
}) {
  const rowClass = tone === 'repeat'
    ? 'border-emerald-200/70 bg-emerald-50/55 hover:bg-emerald-50'
    : 'border-amber-200/70 bg-amber-50/55 hover:bg-amber-50'

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {customers.map((customer) => (
          <Link key={customer.id} href={`/customers/${customer.id}`} className={`group rounded-lg border p-3 ${rowClass}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold">{customer.fullName}</p>
                <p className="text-xs text-muted-foreground">{customer.customerStatus} - {customer.totalOrders} orders - {money(customer.totalSpent)}</p>
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}

function formatChannelPath(path: string) {
  const [first, last] = path.split(' -> ') as Array<keyof typeof channelLabels>
  return `${channelLabels[first] ?? first} -> ${channelLabels[last] ?? last}`
}

function channelPathFilters(path: string) {
  const [firstChannel, lastChannel] = path.split(' -> ') as SourceChannel[]
  return { firstChannel, lastChannel, segment: 'repeat' as const }
}

function atRiskCustomersValue(customers: ReturnType<typeof useIntelligenceDataset>['dataset']['customers']) {
  return customers
    .filter((customer) => customer.customerStatus === 'AtRisk' || customer.customerStatus === 'Lost')
    .reduce((sum, customer) => sum + customer.totalSpent, 0)
}
