'use client'

import Link from 'next/link'
import { useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, ArrowUpRight, CheckCircle2, Database, RotateCcw, ShieldAlert, SlidersHorizontal, UploadCloud, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TreeSprout } from '@/components/ui/tree-surfaces'
import { useIntelligenceDataset, type DatasetSource } from '@/components/hooks/use-intelligence-dataset'
import { clearWorkspaceConfirmationText } from '@/lib/data-safety'
import { useText } from '@/lib/i18n'
import { classifyCustomer } from '@/lib/services/classification'
import { buildCustomersHref } from '@/lib/services/customer-filters'
import { channelLabels, type CustomerProfile, type IntelligenceDataset } from '@/lib/types'
import { dateLabel, money, percent } from '@/lib/utils'

const dataSourceLabels: Record<DatasetSource, string> = {
  production: 'Production workspace',
  'local-demo': 'Local demo storage',
  disconnected: 'No data source connected',
}

const dataSourceDetails: Record<DatasetSource, string> = {
  production: 'Data is loaded from the tenant-scoped production store.',
  'local-demo': 'Local demo mode is active. Do not use it for customer truth.',
  disconnected: 'Connect Supabase before importing production customer data.',
}

export function SettingsClient() {
  const t = useText()
  const { dataset, loading, dataSource, updateVipThreshold, clearDataset } = useIntelligenceDataset()
  const [clearing, setClearing] = useState(false)
  const [clearConfirmation, setClearConfirmation] = useState('')
  const [clearError, setClearError] = useState<string | null>(null)
  const [vipThresholdDraft, setVipThresholdDraft] = useState<string | null>(null)
  const [vipError, setVipError] = useState<string | null>(null)
  const [vipMessage, setVipMessage] = useState<string | null>(null)
  const today = useMemo(() => new Date(), [])
  const overview = useMemo(() => buildWorkspaceOverview(dataset), [dataset])
  const recommendedAction = useMemo(() => recommendedWorkspaceAction(dataset, overview.identityCoverage), [dataset, overview.identityCoverage])
  const vipThresholdValue = vipThresholdDraft ?? String(dataset.vipThreshold)
  const parsedVipThreshold = Number(vipThresholdValue)
  const hasValidVipThreshold = Number.isFinite(parsedVipThreshold) && parsedVipThreshold >= 0
  const previewVipCustomers = hasValidVipThreshold
    ? countVipCustomersAtThreshold(dataset.customers, parsedVipThreshold, today)
    : null
  const hasWorkspaceData = dataset.customers.length > 0 || dataset.orders.length > 0 || dataset.imports.length > 0
  const canClearWorkspace = hasWorkspaceData && clearConfirmation === clearWorkspaceConfirmationText && !clearing

  const applyVipThreshold = () => {
    if (!hasValidVipThreshold) {
      setVipMessage(null)
      setVipError(t('Enter a VIP spend threshold of 0 or more.'))
      return
    }

    try {
      updateVipThreshold(parsedVipThreshold)
      setVipThresholdDraft(null)
      setVipError(null)
      setVipMessage(t('VIP threshold applied to this session.'))
    } catch (error) {
      setVipMessage(null)
      setVipError(error instanceof Error ? error.message : t('VIP threshold was not updated.'))
    }
  }

  const clearWorkspace = async () => {
    if (!canClearWorkspace) return

    setClearing(true)
    setClearError(null)
    try {
      await clearDataset(clearConfirmation)
      setClearConfirmation('')
    } catch {
      setClearError(t('Workspace data was not cleared. Check the confirmation text and try again.'))
    } finally {
      setClearing(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('Loading settings')}</CardTitle>
          <CardDescription>{t('Checking workspace data source before showing controls.')}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="h-auto flex-wrap justify-start bg-secondary/55">
        <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
        <TabsTrigger value="rules">{t('Rules')}</TabsTrigger>
        <TabsTrigger value="operations">{t('Operations')}</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="mt-4">
        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <Card className="border-primary/10 bg-card">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <Database className="size-9 rounded-lg border border-primary/15 bg-primary/10 p-2 text-primary" />
              <div>
                <CardTitle>{t('Workspace status')}</CardTitle>
                <CardDescription>{t(dataSourceDetails[dataSource])}</CardDescription>
              </div>
              <Badge variant={dataSource === 'production' ? 'secondary' : dataSource === 'local-demo' ? 'outline' : 'destructive'} className="sm:ml-auto">
                {t(dataSourceLabels[dataSource])}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatTile label={t('Customers')} value={overview.customerCount.toLocaleString()} detail={t('known profiles')} icon={<Users size={16} />} />
                <StatTile label={t('Orders')} value={overview.orderCount.toLocaleString()} detail={money(overview.totalRevenue)} icon={<Database size={16} />} tone="income" />
                <StatTile label={t('VIP buyers')} value={overview.vipCount.toLocaleString()} detail={`${t('threshold')} ${money(dataset.vipThreshold)}`} icon={<CheckCircle2 size={16} />} tone="vip" />
                <StatTile label={t('Win-back queue')} value={overview.winBackCount.toLocaleString()} detail={t('At Risk or Lost')} icon={<AlertTriangle size={16} />} tone={overview.winBackCount > 0 ? 'risk' : 'neutral'} />
              </div>
              <Separator className="my-5" />
              <div className="grid gap-3 lg:grid-cols-3">
                <HealthRow label={t('Identity coverage')} value={percent(overview.identityCoverage)} detail={t('profiles with email, phone, or LINE ID')} healthy={overview.identityCoverage >= 0.7 || overview.customerCount === 0} />
                <HealthRow label={t('Active channels')} value={overview.activeChannels.toLocaleString()} detail={overview.channelNames.length ? overview.channelNames.map((channel) => t(channel)).join(', ') : t('No channel data')} healthy={overview.activeChannels > 0} />
                <HealthRow label={t('Last import')} value={t(overview.lastImportLabel)} detail={t(overview.lastImportRows)} healthy={overview.importCount > 0} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/10 bg-card">
            <CardHeader>
              <CardTitle>{t('Recommended next action')}</CardTitle>
              <CardDescription>{t(recommendedAction.detail)}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Button asChild className="w-fit">
                <Link href={recommendedAction.href}>
                  {t(recommendedAction.title)}
                  <ArrowUpRight size={15} />
                </Link>
              </Button>
              <div className="grid gap-2">
                <ActionShortcut href="/imports" title="Import orders" detail="Upload or sync the next CSV." icon={<UploadCloud size={15} />} />
                <ActionShortcut href={buildCustomersHref({ segment: 'winback', sort: 'lastOrder' })} title="Review win-back queue" detail="Open stale customers sorted by last order." icon={<Users size={15} />} />
                <ActionShortcut href="/income" title="Check VAT and income" detail="Review tax estimate and CSV sync settings." icon={<Database size={15} />} />
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
      <TabsContent value="rules" className="mt-4">
        <Card className="border-primary/10 bg-card">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <SlidersHorizontal className="size-9 rounded-lg border border-primary/15 bg-primary/10 p-2 text-primary" />
            <div>
              <CardTitle>{t('Classification rules')}</CardTitle>
              <CardDescription>{t('Operational rules used by retention scoring, segmentation, and lifecycle automation.')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-3 md:grid-cols-5">
              <RulePill label="New" detail="1 order" />
              <RulePill label="Repeat" detail="2+ orders" />
              <RulePill label="VIP" detail="3+ orders and spend threshold" />
              <RulePill label="At Risk" detail="No purchase in 30 days" />
              <RulePill label="Lost" detail="No purchase in 90 days" />
            </div>
            <Separator className="my-5" />
            <div className="grid gap-4 lg:grid-cols-[minmax(260px,360px)_1fr]">
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="vip-threshold">{t('VIP spend threshold')}</Label>
                  <Input
                    id="vip-threshold"
                    min={0}
                    step={100}
                    type="number"
                    value={vipThresholdValue}
                    onChange={(event) => {
                      setVipThresholdDraft(event.target.value)
                      setVipError(null)
                      setVipMessage(null)
                    }}
                  />
                </div>
                {vipError ? <p role="alert" className="text-sm font-semibold text-destructive">{t(vipError)}</p> : null}
                {vipMessage ? <p className="text-sm font-semibold text-emerald-700">{vipMessage}</p> : null}
                <Button type="button" className="w-fit" onClick={applyVipThreshold}>{t('Apply threshold')}</Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <StatTile label={t('Current VIP')} value={overview.vipCount.toLocaleString()} detail={t('using active status')} icon={<CheckCircle2 size={16} />} tone="vip" />
                <StatTile label={t('Preview VIP')} value={previewVipCustomers === null ? t('Invalid') : previewVipCustomers.toLocaleString()} detail={t('if this threshold is applied')} icon={<SlidersHorizontal size={16} />} tone="vip" />
                <StatTile label={t('Current threshold')} value={money(dataset.vipThreshold)} detail={t('used for new imports')} icon={<Database size={16} />} />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="operations" className="mt-4">
        <Card className="border-primary/10 bg-card">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <TreeSprout className="size-9 rounded-lg" />
            <div>
              <CardTitle>{t('Safe workspace operations')}</CardTitle>
              <CardDescription>{t('Use these controls only when you mean to change workspace data.')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-[1fr_420px]">
            <div className="grid gap-3">
              <ActionShortcut href="/admin" title="Open admin diagnostics" detail="Check tenant, billing, ingestion failures, and audit activity." icon={<ShieldAlert size={15} />} />
              <ActionShortcut href="/tutorials" title="Open operating guide" detail="Follow the shortest setup path for a real merchant workspace." icon={<CheckCircle2 size={15} />} />
              <ActionShortcut href="/analytics" title="Review retention analytics" detail="Use cohorts, RFM, products, and opportunities after import." icon={<ArrowUpRight size={15} />} />
            </div>
            <div>
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <div className="flex items-start gap-3">
                  <RotateCcw className="mt-0.5 size-5 text-destructive" />
                  <div>
                    <h3 className="font-semibold text-foreground">{t('Data reset')}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{t('Clearing removes imported customers, orders, and import history from this workspace.')}</p>
                  </div>
                </div>
              </div>
              <Separator className="my-5" />
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="clear-confirmation">{t('Data reset confirmation')}</Label>
                  <Input
                    id="clear-confirmation"
                    value={clearConfirmation}
                    placeholder={clearWorkspaceConfirmationText}
                    disabled={!hasWorkspaceData || clearing}
                    onChange={(event) => setClearConfirmation(event.target.value)}
                  />
                </div>
                {clearError ? <p role="alert" className="text-sm font-semibold text-destructive">{clearError}</p> : null}
                <Button variant="destructive" className="w-fit font-semibold" disabled={!canClearWorkspace} onClick={() => void clearWorkspace()}>
                  {clearing ? t('Clearing...') : hasWorkspaceData ? t('Clear workspace data') : t('No workspace data to clear')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

function buildWorkspaceOverview(dataset: IntelligenceDataset) {
  const totalRevenue = dataset.orders.reduce((sum, order) => sum + order.totalAmount, 0)
  const contactReadyCustomers = dataset.customers.filter((customer) => customer.email || customer.phone || customer.lineId).length
  const activeChannelKeys = Array.from(new Set(dataset.orders.map((order) => order.sourceChannel)))
  const latestImport = [...dataset.imports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

  return {
    customerCount: dataset.customers.length,
    orderCount: dataset.orders.length,
    importCount: dataset.imports.length,
    totalRevenue,
    vipCount: dataset.customers.filter((customer) => customer.customerStatus === 'VIP').length,
    winBackCount: dataset.customers.filter((customer) => customer.customerStatus === 'AtRisk' || customer.customerStatus === 'Lost').length,
    identityCoverage: dataset.customers.length ? contactReadyCustomers / dataset.customers.length : 0,
    activeChannels: activeChannelKeys.length,
    channelNames: activeChannelKeys.map((channel) => channelLabels[channel]),
    lastImportLabel: latestImport ? dateLabel(latestImport.createdAt) : 'No imports yet',
    lastImportRows: latestImport ? `${latestImport.importedRows.toLocaleString()} ${latestImport.importedRows === 1 ? 'row' : 'rows'} imported` : 'Import orders to start',
  }
}

function recommendedWorkspaceAction(dataset: IntelligenceDataset, identityCoverage: number) {
  const winBackCount = dataset.customers.filter((customer) => customer.customerStatus === 'AtRisk' || customer.customerStatus === 'Lost').length
  const repeatCount = dataset.customers.filter((customer) => customer.totalOrders >= 2).length

  if (dataset.orders.length === 0) {
    return {
      title: 'Import first orders',
      detail: 'Settings are most useful after the first real order import.',
      href: '/imports',
    }
  }

  if (identityCoverage < 0.7) {
    return {
      title: 'Improve customer identity',
      detail: 'Many profiles are missing email, phone, or LINE ID, so future merges may be weaker.',
      href: '/imports',
    }
  }

  if (winBackCount > 0) {
    return {
      title: 'Review win-back queue',
      detail: 'At Risk and Lost customers are already visible from this workspace.',
      href: buildCustomersHref({ segment: 'winback', sort: 'lastOrder' }),
    }
  }

  if (repeatCount === 0) {
    return {
      title: 'Import latest orders',
      detail: 'More order history is needed before repeat and VIP work becomes useful.',
      href: '/imports',
    }
  }

  return {
    title: 'Open retention analytics',
    detail: 'This workspace has enough data for cohort, RFM, and opportunity review.',
    href: '/analytics',
  }
}

function countVipCustomersAtThreshold(customers: CustomerProfile[], vipThreshold: number, today: Date) {
  return customers.filter((customer) => classifyCustomer(customer, vipThreshold, today) === 'VIP').length
}

function StatTile({
  label,
  value,
  detail,
  icon,
  tone = 'neutral',
}: {
  label: string
  value: string
  detail: string
  icon: ReactNode
  tone?: 'neutral' | 'income' | 'vip' | 'risk'
}) {
  const toneClass = {
    neutral: 'border-border bg-secondary/35',
    income: 'border-cyan-200/80 bg-cyan-50/65',
    vip: 'border-violet-200/80 bg-violet-50/65',
    risk: 'border-rose-200/80 bg-rose-50/65',
  }[tone]

  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs font-black uppercase text-muted-foreground">
        {icon}
        {label}
      </div>
      <strong className="mt-2 block text-2xl font-black tracking-tight text-foreground">{value}</strong>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

function HealthRow({
  label,
  value,
  detail,
  healthy,
}: {
  label: string
  value: string
  detail: string
  healthy: boolean
}) {
  const t = useText()

  return (
    <div className="rounded-lg border border-border bg-secondary/35 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase text-muted-foreground">{label}</p>
        <Badge variant={healthy ? 'secondary' : 'outline'}>{healthy ? t('OK') : t('Needs work')}</Badge>
      </div>
      <strong className="mt-2 block text-lg font-black text-foreground">{value}</strong>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  )
}

function ActionShortcut({
  href,
  title,
  detail,
  icon,
}: {
  href: string
  title: string
  detail: string
  icon: ReactNode
}) {
  const t = useText()

  return (
    <Link
      href={href}
      className="tree-tactile group flex items-start justify-between gap-3 rounded-lg border border-border bg-secondary/35 p-3 hover:bg-secondary/65 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
    >
      <span className="flex items-start gap-3">
        <span className="rounded-md border border-primary/15 bg-primary/10 p-1.5 text-primary">{icon}</span>
        <span>
          <span className="block text-sm font-semibold text-foreground">{t(title)}</span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">{t(detail)}</span>
        </span>
      </span>
      <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary" />
    </Link>
  )
}

function RulePill({ label, detail }: { label: string; detail: string }) {
  const t = useText()

  return (
    <div className="rounded-lg border border-border bg-secondary/35 p-3">
      <p className="font-semibold text-foreground">{t(label)}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{t(detail)}</p>
    </div>
  )
}
