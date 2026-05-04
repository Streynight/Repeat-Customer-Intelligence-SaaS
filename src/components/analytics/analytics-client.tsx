'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { ArrowUpRight, Boxes, GitBranch, TrendingUp, UploadCloud, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, MetricCard } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TreeEmptyState } from '@/components/ui/tree-surfaces'
import { buildCustomersHref } from '@/lib/services/customer-filters'
import { buildRetentionAnalytics, type CustomerOpportunity, type ProductRepeatInsight, type RfmSegment } from '@/lib/services/retention-analytics'
import { useIntelligenceDataset } from '@/components/hooks/use-intelligence-dataset'
import { channelLabels } from '@/lib/types'
import { useText } from '@/lib/i18n'
import { money, percent } from '@/lib/utils'

type AnalyticsTab = 'retention' | 'cohorts' | 'products' | 'opportunities'

const tabs: AnalyticsTab[] = ['retention', 'cohorts', 'products', 'opportunities']

export function AnalyticsClient() {
  const { dataset, loading } = useIntelligenceDataset()
  const t = useText()
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedTab = normalizeTab(searchParams.get('tab'))
  const analytics = useMemo(() => buildRetentionAnalytics(dataset), [dataset])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('Loading analytics')}</CardTitle>
          <CardDescription>{t('Building retention cohorts, product repeat insights, and customer opportunities.')}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (dataset.customers.length === 0 && dataset.orders.length === 0) {
    return <EmptyAnalytics />
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label={t('Repeat revenue share')} value={percent(analytics.summary.repeatRevenueShare)} tone="repeat" href={buildCustomersHref({ segment: 'repeat', sort: 'repeatRevenue' })} />
        <MetricCard label={t('Second purchase')} value={percent(analytics.summary.secondPurchaseConversion)} tone="repeat" href={buildCustomersHref({ segment: 'repeat' })} />
        <MetricCard label={t('Days to 2nd order')} value={formatDays(analytics.summary.averageDaysToSecondOrder)} href="/analytics?tab=cohorts" />
        <MetricCard label={t('VIP concentration')} value={percent(analytics.summary.vipRevenueConcentration)} tone="vip" href={buildCustomersHref({ status: 'VIP', sort: 'totalSpent' })} />
        <MetricCard label={t('At-risk value')} value={money(analytics.summary.atRiskValue)} tone="risk" href={buildCustomersHref({ segment: 'winback', sort: 'lastOrder' })} />
      </section>

      <Tabs
        value={selectedTab}
        onValueChange={(value) => router.push(value === 'retention' ? '/analytics' : `/analytics?tab=${value}`)}
      >
        <TabsList className="w-full justify-start overflow-x-auto bg-secondary/55 p-1">
          <TabsTrigger value="retention">{t('Retention')}</TabsTrigger>
          <TabsTrigger value="cohorts">{t('Cohorts')}</TabsTrigger>
          <TabsTrigger value="products">{t('Products')}</TabsTrigger>
          <TabsTrigger value="opportunities">{t('Opportunities')}</TabsTrigger>
        </TabsList>

        <TabsContent value="retention" className="space-y-6">
          <RetentionTab analytics={analytics} />
        </TabsContent>
        <TabsContent value="cohorts" className="space-y-6">
          <CohortsTab analytics={analytics} />
        </TabsContent>
        <TabsContent value="products" className="space-y-6">
          <ProductsTab products={analytics.productInsights} />
        </TabsContent>
        <TabsContent value="opportunities" className="space-y-6">
          <OpportunitiesTab opportunities={analytics.opportunities} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EmptyAnalytics() {
  const t = useText()

  return (
    <TreeEmptyState
      title={t('Deep analytics starts after import')}
      description={t('Import order CSVs to unlock cohorts, RFM segments, product repeat paths, channel quality, and opportunity lists from your real customers.')}
      action={{ href: '/imports', label: t('Import orders'), icon: <UploadCloud size={16} /> }}
    />
  )
}

function RetentionTab({ analytics }: { analytics: ReturnType<typeof buildRetentionAnalytics> }) {
  const t = useText()
  const topRfm = analytics.rfmScores.slice(0, 6)

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_440px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            {t('RFM customer segments')}
          </CardTitle>
          <CardDescription>{t('Recency, frequency, and monetary value compressed into actionable customer groups.')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {segmentCounts(analytics.rfmScores).map((row) => (
            <Link
              key={row.segment}
              href={buildCustomersHref({ rfmSegment: row.segment, sort: 'totalSpent' })}
              className="tree-tactile group rounded-lg border border-border bg-secondary/30 p-4 hover:bg-secondary/55 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-muted-foreground">{t(row.segment)}</p>
                  <strong className="mt-2 block text-3xl font-black">{row.count}</strong>
                  <p className="text-xs text-muted-foreground">{money(row.revenue)} {t('customer value')}</p>
                </div>
                <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary" />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('Highest RFM scores')}</CardTitle>
          <CardDescription>{t('Best customers to protect, reward, or learn from.')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {topRfm.map((score) => (
            <Link
              key={score.customerId}
              href={`/customers/${score.customerId}`}
              className="group rounded-lg border border-border bg-card p-3 transition hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{score.customerName}</p>
                  <p className="text-xs text-muted-foreground">R{score.recencyScore} F{score.frequencyScore} M{score.monetaryScore} - {t(score.segment)}</p>
                </div>
                <Badge variant="secondary">{score.totalScore}</Badge>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" />
            {t('Channel quality')}
          </CardTitle>
          <CardDescription>{t('Which first-purchase channels create repeat buyers and repeat revenue.')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('First channel')}</TableHead>
                <TableHead>{t('Customers')}</TableHead>
                <TableHead>{t('Repeat rate')}</TableHead>
                <TableHead>{t('Repeat revenue')}</TableHead>
                <TableHead>{t('Avg days to repeat')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.channelQuality.map((row) => (
                <TableRow key={row.channel}>
                  <TableCell>
                    <Link href={buildCustomersHref({ firstChannel: row.channel })} className="font-bold text-primary hover:underline">
                      {t(channelLabels[row.channel])}
                    </Link>
                  </TableCell>
                  <TableCell>{row.firstChannelCustomers}</TableCell>
                  <TableCell>{percent(row.repeatRate)}</TableCell>
                  <TableCell>{money(row.repeatRevenue)}</TableCell>
                  <TableCell>{formatDays(row.averageDaysToRepeat)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function CohortsTab({ analytics }: { analytics: ReturnType<typeof buildRetentionAnalytics> }) {
  const t = useText()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="size-5 text-primary" />
          {t('Cohort retention')}
        </CardTitle>
        <CardDescription>{t('First-order month cohorts with active customer retention from M0 to M5.')}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Cohort')}</TableHead>
              <TableHead>{t('Size')}</TableHead>
              {Array.from({ length: 6 }, (_, index) => <TableHead key={index}>M{index}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {analytics.cohorts.map((row) => (
              <TableRow key={row.cohortMonth}>
                <TableCell className="font-bold">{row.cohortMonth}</TableCell>
                <TableCell>{row.cohortSize}</TableCell>
                {row.cells.map((cell) => (
                  <TableCell key={cell.monthOffset}>
                    <div className={`rounded-lg px-2 py-2 text-center text-xs font-bold ${heatClass(cell.retentionRate)}`}>
                      <span>{percent(cell.retentionRate)}</span>
                      <p className="mt-1 font-medium opacity-75">{cell.activeCustomers} {t('buyers')}</p>
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function ProductsTab({ products }: { products: ProductRepeatInsight[] }) {
  const t = useText()

  if (products.length === 0) {
    return (
      <TreeEmptyState
        title={t('No product repeat data yet')}
        description={t('Import CSV rows with product_name, quantity, and unit_price to unlock product journeys.')}
        action={{ href: '/imports', label: t('Import product rows'), icon: <UploadCloud size={16} /> }}
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Boxes className="size-5 text-primary" />
          {t('Product repeat intelligence')}
        </CardTitle>
        <CardDescription>{t('Products that pull customers back, plus the next products they commonly buy.')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Product')}</TableHead>
              <TableHead>{t('Repeat revenue')}</TableHead>
              <TableHead>{t('Repeat buyers')}</TableHead>
              <TableHead>{t('Revenue')}</TableHead>
              <TableHead>{t('Common next products')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.productName}>
                <TableCell>
                  <Link href={buildCustomersHref({ product: product.productName, sort: 'repeatRevenue' })} className="font-bold text-primary hover:underline">
                    {product.productName}
                  </Link>
                </TableCell>
                <TableCell>{money(product.repeatRevenue)}</TableCell>
                <TableCell>{product.repeatCustomerCount}</TableCell>
                <TableCell>{money(product.revenue)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {product.commonNextProducts.length > 0 ? product.commonNextProducts.map((next) => (
                      <Badge key={next.productName} variant="secondary">{next.productName} x{next.count}</Badge>
                    )) : <span className="text-xs text-muted-foreground">{t('No next-product pattern yet')}</span>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function OpportunitiesTab({ opportunities }: { opportunities: CustomerOpportunity[] }) {
  const t = useText()

  if (opportunities.length === 0) {
    return (
      <TreeEmptyState
        title={t('No opportunities yet')}
        description={t('Import more orders to surface win-back, second purchase, VIP protection, and cross-sell opportunities.')}
        tone="risk"
        action={{ href: '/imports', label: t('Import more orders'), icon: <UploadCloud size={16} /> }}
      />
    )
  }

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {opportunities.map((opportunity) => (
        <Link
          key={opportunity.id}
          href={`/customers/${opportunity.customerId}`}
          className={`tree-tactile group rounded-lg border p-4 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45 ${opportunityClass(opportunity)}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="capitalize">{t(opportunity.type.replace('-', ' '))}</Badge>
                <Badge variant={opportunity.priority === 'high' ? 'destructive' : 'secondary'}>{t(opportunity.priority)}</Badge>
              </div>
              <h3 className="mt-3 font-black">{t(opportunity.title)}</h3>
              <p className="mt-1 text-sm font-semibold">{opportunity.customerName}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{formatOpportunityDetail(opportunity.detail, t)}</p>
              {opportunity.targetProduct ? <p className="mt-2 text-xs font-bold text-primary">{t('Target product:')} {opportunity.targetProduct}</p> : null}
            </div>
            <div className="text-right">
              <strong className="block text-lg">{money(opportunity.value)}</strong>
              <p className="mt-1 text-xs text-muted-foreground">{opportunity.daysSinceLastOrder} {t('days ago')}</p>
              <ArrowUpRight className="ml-auto mt-3 size-4 text-muted-foreground group-hover:text-primary" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

function segmentCounts(scores: ReturnType<typeof buildRetentionAnalytics>['rfmScores']) {
  const counts = new Map<RfmSegment, { segment: RfmSegment; count: number; revenue: number }>()

  scores.forEach((score) => {
    const current = counts.get(score.segment) ?? { segment: score.segment, count: 0, revenue: 0 }
    current.count += 1
    current.revenue += score.totalSpent
    counts.set(score.segment, current)
  })

  return Array.from(counts.values()).sort((a, b) => b.count - a.count || b.revenue - a.revenue)
}

function normalizeTab(tab: string | null): AnalyticsTab {
  return tabs.includes(tab as AnalyticsTab) ? tab as AnalyticsTab : 'retention'
}

function formatDays(days: number | null) {
  if (days === null) return '-'
  return `${Math.round(days)}d`
}

function heatClass(retentionRate: number) {
  if (retentionRate >= 0.75) return 'bg-emerald-100 text-emerald-950'
  if (retentionRate >= 0.5) return 'bg-emerald-50 text-emerald-900'
  if (retentionRate >= 0.25) return 'bg-cyan-50 text-cyan-900'
  return 'bg-secondary text-muted-foreground'
}

function opportunityClass(opportunity: CustomerOpportunity) {
  if (opportunity.type === 'win-back') return 'border-rose-200 bg-rose-50/70'
  if (opportunity.type === 'vip-protect') return 'border-violet-200 bg-violet-50/75'
  if (opportunity.type === 'cross-sell') return 'border-emerald-200 bg-emerald-50/60'
  return 'border-border bg-card'
}

function formatOpportunityDetail(detail: string, t: (text: string) => string) {
  const staleMatch = /^(AtRisk|Lost) customer with (\d+) orders and no recent purchase\.$/.exec(detail)
  if (staleMatch) return `${t(staleMatch[1])} ${t('customer with')} ${staleMatch[2]} ${t('orders and no recent purchase.')}`

  const crossSellMatch = /^Has not bought (.+), one of the strongest repeat products\.$/.exec(detail)
  if (crossSellMatch) return `${t('Has not bought')} ${crossSellMatch[1]}, ${t('one of the strongest repeat products.')}`

  return t(detail)
}
