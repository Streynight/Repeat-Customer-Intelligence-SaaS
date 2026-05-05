'use client'

import Link from 'next/link'
import { ArrowUpRight, BookOpenCheck, CalendarDays, LineChart as LineChartIcon, Repeat2, UploadCloud, Users } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts'
import { ActivationCommandCenter } from '@/components/activation/activation-command-center'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, MetricCard } from '@/components/ui/card'
import { InsightPanel, TreeEmptyState } from '@/components/ui/tree-surfaces'
import { dashboardMetrics, customersByStatus, firstVsRepeatChannel, monthlyRepeatTrend, repeatRevenueByChannel } from '@/lib/services/attribution'
import { buildCustomersHref } from '@/lib/services/customer-filters'
import { buildIncomeSummary } from '@/lib/services/finance'
import { buildRetentionAnalytics } from '@/lib/services/retention-analytics'
import { useIntelligenceDataset } from '@/components/hooks/use-intelligence-dataset'
import { channelLabels, type SourceChannel } from '@/lib/types'
import { useText } from '@/lib/i18n'
import { money, percent } from '@/lib/utils'

const colors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

export function DashboardClient() {
  const { dataset, loading } = useIntelligenceDataset()
  const t = useText()

  if (loading) {
    return <DashboardLoading />
  }

  if (dataset.customers.length === 0 && dataset.orders.length === 0) {
    return <EmptyDashboard dataset={dataset} />
  }

  const metrics = dashboardMetrics(dataset)
  const repeatRevenue = repeatRevenueByChannel(dataset.customers)
  const statusRows = customersByStatus(dataset.customers)
  const channelPaths = firstVsRepeatChannel(dataset.customers)
  const monthlyTrend = monthlyRepeatTrend(dataset.customers)
  const retentionAnalytics = buildRetentionAnalytics(dataset)
  const incomeSummary = buildIncomeSummary(dataset)
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
  const customerById = new Map(dataset.customers.map((customer) => [customer.id, customer]))
  const recentOrders = [...dataset.orders]
    .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <ActivationCommandCenter dataset={dataset} compact />

      <div className="grid gap-4 xl:grid-cols-3">
        <InsightPanel
          label={t('Best repeat channel')}
          value={bestRepeatChannel ? t(channelLabels[bestRepeatChannel.channel]) : t('No repeats yet')}
          detail={bestRepeatChannel ? `${money(bestRepeatChannel.revenue)} ${t('in repeat revenue')}` : t('Import orders to see channel winners.')}
          tone="repeat"
          icon={<Repeat2 size={17} />}
          href={bestRepeatChannel ? buildCustomersHref({ repeatChannel: bestRepeatChannel.channel, sort: 'repeatRevenue' }) : buildCustomersHref({ segment: 'repeat' })}
        />
        <InsightPanel
          label={t('Top channel path')}
          value={bestRepeatPath ? formatChannelPath(bestRepeatPath.path, t) : t('No path yet')}
          detail={bestRepeatPath ? `${bestRepeatPath.customers} ${t('customers repeated through this path')}` : t('Repeat customers reveal source-to-repeat movement.')}
          tone="vip"
          icon={<LineChartIcon size={17} />}
          href={bestRepeatPath ? buildCustomersHref(channelPathFilters(bestRepeatPath.path)) : buildCustomersHref({ segment: 'repeat' })}
        />
        <InsightPanel
          label={t('Remarketing urgency')}
          value={money(atRiskRevenue)}
          detail={t('Revenue sitting in At Risk or Lost customer profiles')}
          tone="risk"
          icon={<Users size={17} />}
          href={buildCustomersHref({ segment: 'winback', sort: 'lastOrder' })}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <ActionLink href={buildCustomersHref({ segment: 'repeat', sort: 'repeatRevenue' })} title="Review repeat buyers" detail="Open the buyers driving repeated orders." />
        <ActionLink href={buildCustomersHref({ segment: 'winback', sort: 'lastOrder' })} title="Win back stale buyers" detail="Focus At Risk and Lost profiles first." />
        <ActionLink href="/imports" title="Import latest orders" detail="Refresh the dashboard with a marketplace order file." />
        <ActionLink href="/analytics" title="Open deep analytics" detail="Cohorts, RFM, product repeat, and opportunities." />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <MetricCard label={t('Total income')} value={money(incomeSummary.grossIncome)} tone="income" href="/income" />
        <MetricCard label={t('Known buyers')} value={metrics.totalCustomers.toLocaleString()} href={buildCustomersHref()} />
        <MetricCard label={t('Bought again')} value={metrics.repeatCustomers.toLocaleString()} tone="repeat" href={buildCustomersHref({ segment: 'repeat' })} />
        <MetricCard label={t('Repeat rate')} value={percent(metrics.repeatRate)} tone="repeat" href={buildCustomersHref({ segment: 'repeat' })} />
        <MetricCard label={t('VIP buyers')} value={metrics.vipCustomers.toLocaleString()} tone="vip" href={buildCustomersHref({ status: 'VIP' })} />
        <MetricCard label={t('Need win-back')} value={metrics.atRiskCustomers.toLocaleString()} tone="risk" href={buildCustomersHref({ segment: 'winback' })} />
        <MetricCard label={t('Repeat revenue')} value={money(metrics.repeatRevenue)} tone="repeat" href={buildCustomersHref({ segment: 'repeat', sort: 'repeatRevenue' })} />
      </div>

      <AnalyticsSnapshot analytics={retentionAnalytics} />

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Repeat Revenue by Channel">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={repeatRevenue}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="channel" tickFormatter={(value) => t(channelLabels[value as keyof typeof channelLabels])} />
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
              <XAxis dataKey="status" tickFormatter={(value) => t(String(value))} />
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
                className="tree-tactile group flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2 hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
              >
                <span className="text-sm font-semibold text-foreground">{formatChannelPath(row.path, t)}</span>
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
            <CardTitle>{t('Recent Orders')}</CardTitle>
            <CardDescription>{t('Latest imported orders visible on the dashboard.')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {recentOrders.map((order) => {
              const customer = customerById.get(order.customerProfileId)
              const isRepeatBuyer = (customer?.totalOrders ?? 0) >= 2

              return (
                <Link
                  key={order.id}
                  href={`/customers/${order.customerProfileId}`}
                  className="tree-tactile group rounded-lg border border-border bg-secondary/35 p-3 hover:bg-secondary/55 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">{order.externalOrderId || order.id}</p>
                      <p className="text-xs text-muted-foreground">{order.customerNameRaw} - {money(order.totalAmount)}</p>
                    </div>
                    <Badge variant="secondary">{t(isRepeatBuyer ? 'Repeat buyer' : 'New buyer')}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{t(channelLabels[order.sourceChannel])} - {order.orderDate.slice(0, 10)}</p>
                </Link>
              )
            })}
            {recentOrders.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                {t('No orders yet. Import an order file to show recent order activity here.')}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DashboardLoading() {
  const t = useText()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Loading workspace')}</CardTitle>
        <CardDescription>{t('Checking your store data before showing repeat intelligence.')}</CardDescription>
      </CardHeader>
    </Card>
  )
}

function EmptyDashboard({ dataset }: { dataset: ReturnType<typeof useIntelligenceDataset>['dataset'] }) {
  const t = useText()

  return (
    <div className="space-y-6">
      <ActivationCommandCenter dataset={dataset} />

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div>
          <TreeEmptyState
            title={t('Start with your first order import')}
            description={t('This workspace is clean. Upload a CSV to grow customer profiles, repeat revenue, channel paths, and follow-up timing from your own store data.')}
            action={{ href: '/imports', label: t('Import orders'), icon: <UploadCloud size={16} /> }}
            secondaryAction={{ href: '/tutorials', label: t('Follow tutorial'), icon: <BookOpenCheck size={16} /> }}
          />
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <EmptyStep icon={UploadCloud} title="Import CSV" detail="Bring in orders from Shopee, TikTok Shop, social, website, or custom exports." />
            <EmptyStep icon={Users} title="Resolve buyers" detail="Phone, email, LINE ID, and names create unified customer profiles." />
            <EmptyStep icon={CalendarDays} title="Track repeat timing" detail="Calendar and win-back views appear after the first import." />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('Current workspace')}</CardTitle>
            <CardDescription>{t('No customer, order, revenue, or import records yet.')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <EmptyWorkspaceStat label="Known buyers" value="0" />
            <EmptyWorkspaceStat label="Repeat revenue" value={money(0)} tone="repeat" />
            <EmptyWorkspaceStat label="Need win-back" value="0" tone="risk" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function EmptyWorkspaceStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: 'neutral' | 'repeat' | 'risk'
}) {
  const t = useText()
  const className = {
    neutral: 'bg-card text-foreground',
    repeat: 'bg-emerald-50 text-emerald-900',
    risk: 'bg-rose-50 text-rose-900',
  }[tone]

  return (
    <div className={`rounded-lg border border-border px-3 py-2 ${className}`}>
      <p className="text-[0.7rem] font-black uppercase opacity-70">{t(label)}</p>
      <strong className="mt-1 block text-xl font-black">{value}</strong>
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
  const t = useText()

  return (
    <div className="rounded-lg border border-border bg-card/75 p-4">
      <Icon size={18} className="text-primary" />
      <h3 className="mt-3 font-black">{t(title)}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{t(detail)}</p>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useText()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(title)}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function AnalyticsSnapshot({ analytics }: { analytics: ReturnType<typeof buildRetentionAnalytics> }) {
  const t = useText()
  const topProduct = analytics.productInsights[0]
  const topSegment = analytics.summary.topRfmSegment

  return (
    <Card className="border-primary/15 bg-card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <LineChartIcon className="size-5 text-primary" />
            <h2 className="font-black">{t('Deep analytics snapshot')}</h2>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {t('Cohorts, RFM, product repeat paths, and opportunity lists are ready for deeper decisions.')}
          </p>
        </div>
        <div className="grid gap-2 md:grid-cols-3 lg:min-w-[620px]">
          <SnapshotLink href={topSegment ? buildCustomersHref({ rfmSegment: topSegment, sort: 'totalSpent' }) : '/analytics'} label="Top RFM segment" value={topSegment ?? 'No segment'} />
          <SnapshotLink href={topProduct ? buildCustomersHref({ product: topProduct.productName, sort: 'repeatRevenue' }) : '/analytics?tab=products'} label="Top repeat product" value={topProduct?.productName ?? 'No product data'} />
          <SnapshotLink href="/analytics?tab=cohorts" label="Avg days to repeat" value={analytics.summary.averageDaysToSecondOrder === null ? '-' : `${Math.round(analytics.summary.averageDaysToSecondOrder)}d`} />
        </div>
      </div>
    </Card>
  )
}

function SnapshotLink({ href, label, value }: { href: string; label: string; value: string }) {
  const t = useText()

  return (
    <Link
      href={href}
      className="tree-tactile group rounded-lg border border-border bg-card/75 p-3 hover:bg-card hover:shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[0.68rem] font-black uppercase text-muted-foreground">{t(label)}</p>
          <strong className="mt-1 block truncate text-sm">{t(value)}</strong>
        </div>
        <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary" />
      </div>
    </Link>
  )
}

function ActionLink({ href, title, detail }: { href: string; title: string; detail: string }) {
  const t = useText()

  return (
    <Link href={href} className="tree-tactile group rounded-lg border border-border bg-card/85 p-4 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black">{t(title)}</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{t(detail)}</p>
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
  const t = useText()
  const rowClass = tone === 'repeat'
    ? 'border-emerald-200/70 bg-emerald-50/55 hover:bg-emerald-50'
    : 'border-rose-200/70 bg-rose-50/55 hover:bg-rose-50'

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(title)}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {customers.map((customer) => (
          <Link key={customer.id} href={`/customers/${customer.id}`} className={`tree-tactile group rounded-lg border p-3 ${rowClass}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold">{customer.fullName}</p>
                <p className="text-xs text-muted-foreground">{t(customer.customerStatus)} - {customer.totalOrders} {t('orders')} - {money(customer.totalSpent)}</p>
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary" />
            </div>
          </Link>
        ))}
        {customers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
            {t('Nothing to show yet.')}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function formatChannelPath(path: string, t: (text: string) => string) {
  const [first, last] = path.split(' -> ') as Array<keyof typeof channelLabels>
  return `${t(channelLabels[first] ?? first)} -> ${t(channelLabels[last] ?? last)}`
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
