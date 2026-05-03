'use client'

import Link from 'next/link'
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Circle,
  CircleDot,
  Database,
  FileUp,
  GitMerge,
  PlugZap,
  Repeat2,
  ShieldCheck,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { dashboardMetrics } from '@/lib/services/attribution'
import { buildCustomersHref } from '@/lib/services/customer-filters'
import { channelLabels, type IntelligenceDataset, type SourceChannel } from '@/lib/types'
import { cn, money, percent } from '@/lib/utils'

type ActivationCommandCenterProps = {
  dataset: IntelligenceDataset
  compact?: boolean
  csvSyncConnectionCount?: number
  layout?: 'wide' | 'rail'
  className?: string
}

type ActivationStep = {
  id: string
  title: string
  detail: string
  href: string
  cta: string
  done: boolean
  Icon: LucideIcon
}

type NextAction = {
  title: string
  detail: string
  href: string
  cta: string
}

const migrationSources: Array<{
  channel: SourceChannel
  detail: string
}> = [
  { channel: 'shopee', detail: 'Export paid orders with customer name, phone, order date, amount, and product columns.' },
  { channel: 'tiktok', detail: 'Export recent and historical shop orders so second purchases are visible.' },
  { channel: 'instagram', detail: 'Upload social order sheets with phone, LINE ID, or email for identity matching.' },
  { channel: 'facebook', detail: 'Bring page or inbox order logs into one buyer profile instead of scattered chats.' },
  { channel: 'website', detail: 'Import ecommerce orders to compare owned-channel repeat revenue against marketplaces.' },
  { channel: 'csv', detail: 'Use any clean CSV as long as order ID, customer, date, and amount are mapped.' },
]

export function ActivationCommandCenter({
  dataset,
  compact = false,
  csvSyncConnectionCount = 0,
  layout = 'wide',
  className,
}: ActivationCommandCenterProps) {
  const metrics = dashboardMetrics(dataset)
  const hasImport = dataset.imports.length > 0 || dataset.orders.length > 0
  const contactsWithIdentity = dataset.customers.filter((customer) => customer.email || customer.phone || customer.lineId).length
  const hasCustomerIdentity = contactsWithIdentity > 0
  const hasRepeatCustomers = metrics.repeatCustomers > 0
  const atRiskCustomers = dataset.customers.filter((customer) => customer.customerStatus === 'AtRisk' || customer.customerStatus === 'Lost')
  const hasWinbackQueue = atRiskCustomers.length > 0
  const hasSyncSetup = csvSyncConnectionCount > 0

  const steps: ActivationStep[] = [
    {
      id: 'import',
      title: 'Bring historical orders',
      detail: 'Start with one real export from the channel customers already buy from.',
      href: '/imports',
      cta: 'Import CSV',
      done: hasImport,
      Icon: FileUp,
    },
    {
      id: 'identity',
      title: 'Resolve buyer identity',
      detail: 'Phone, email, LINE ID, and names merge scattered orders into customer profiles.',
      href: buildCustomersHref(),
      cta: 'Review buyers',
      done: hasCustomerIdentity,
      Icon: GitMerge,
    },
    {
      id: 'repeat',
      title: 'Find repeat revenue',
      detail: 'Detect which buyers, products, and channels already create second purchases.',
      href: buildCustomersHref({ segment: 'repeat', sort: 'repeatRevenue' }),
      cta: 'Open repeat list',
      done: hasRepeatCustomers,
      Icon: Repeat2,
    },
    {
      id: 'winback',
      title: 'Build the win-back queue',
      detail: 'Turn stale buyers into a focused follow-up list before they are fully lost.',
      href: buildCustomersHref({ segment: 'winback', sort: 'lastOrder' }),
      cta: 'Open queue',
      done: hasWinbackQueue,
      Icon: CalendarClock,
    },
    {
      id: 'sync',
      title: 'Automate recurring sync',
      detail: 'After the first import works, schedule a CSV sync so reporting stays current.',
      href: '/income?tab=sync',
      cta: 'Set sync',
      done: hasSyncSetup,
      Icon: PlugZap,
    },
  ]

  const completedSteps = steps.filter((step) => step.done).length
  const progress = Math.round((completedSteps / steps.length) * 100)
  const currentStep = steps.find((step) => !step.done) ?? steps[steps.length - 1]
  const nextAction = getNextAction({
    hasImport,
    hasRepeatCustomers,
    hasWinbackQueue,
    hasSyncSetup,
  })
  const atRiskValue = atRiskCustomers.reduce((sum, customer) => sum + customer.totalSpent, 0)

  return (
    <Card className={cn('border-primary/15 bg-card', className)}>
      <CardHeader className="gap-3 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Store size={12} />
              Migration command center
            </Badge>
            <Badge variant={completedSteps === steps.length ? 'default' : 'outline'}>
              {completedSteps}/{steps.length} activated
            </Badge>
          </div>
          <CardTitle className="mt-3 text-lg">Turn imported orders into repeat revenue</CardTitle>
          <CardDescription className="mt-1 max-w-3xl leading-6">
            Guide new accounts from their first marketplace export to buyer identity, repeat revenue, win-back focus, and recurring automation.
          </CardDescription>
        </div>
        <div className="rounded-lg border border-border bg-secondary/35 p-3 md:min-w-48">
          <p className="text-xs font-black uppercase text-muted-foreground">Activation progress</p>
          <strong className="mt-1 block text-3xl font-black text-foreground">{progress}%</strong>
          <div className="mt-3 h-2 rounded-full bg-background">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn(
        'grid gap-4',
        layout === 'wide' && (compact ? 'xl:grid-cols-[1.1fr_0.9fr]' : 'xl:grid-cols-[1.05fr_0.95fr]'),
      )}>
        <div className="space-y-4">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase text-primary">Next best action</p>
                <h3 className="mt-1 font-black text-foreground">{nextAction.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{nextAction.detail}</p>
              </div>
              <Button asChild>
                <Link href={nextAction.href}>
                  {nextAction.cta}
                  <ArrowUpRight size={15} />
                </Link>
              </Button>
            </div>
          </div>

          <ol className="grid gap-2">
            {steps.map((step) => (
              <ActivationStepRow key={step.id} step={step} current={step.id === currentStep.id} />
            ))}
          </ol>
        </div>

        <div className="space-y-4">
          <div className={cn('grid gap-3', layout === 'wide' && 'md:grid-cols-3 xl:grid-cols-1')}>
            <ActivationStat label="Known buyers" value={metrics.totalCustomers.toLocaleString()} detail={`${contactsWithIdentity.toLocaleString()} with contact identity`} Icon={Users} />
            <ActivationStat label="Repeat revenue" value={money(metrics.repeatRevenue)} detail={`${metrics.repeatCustomers.toLocaleString()} repeat buyers, ${percent(metrics.repeatRate)} repeat rate`} Icon={Repeat2} />
            <ActivationStat label="Win-back value" value={money(atRiskValue)} detail={`${atRiskCustomers.length.toLocaleString()} at-risk or lost buyers`} Icon={ShieldCheck} />
          </div>

          {!compact ? (
            <MigrationSourceList />
          ) : (
            <div className="rounded-lg border border-border bg-secondary/30 p-4">
              <div className="flex items-start gap-3">
                <Database className="mt-0.5 size-4 text-primary" />
                <div>
                  <h3 className="font-black">Switching kit</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Shopee, TikTok Shop, Instagram, Facebook, website, and custom CSV exports all start from the same import path.
                  </p>
                  <Button asChild variant="outline" className="mt-3">
                    <Link href="/imports">
                      Open import path
                      <ArrowUpRight size={15} />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ActivationStepRow({ step, current }: { step: ActivationStep; current: boolean }) {
  const Icon = step.Icon

  return (
    <li>
      <Link
        href={step.href}
        className={cn(
          'tree-tactile group flex items-start gap-3 rounded-lg border p-3 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45',
          step.done && 'border-emerald-200 bg-emerald-50/70',
          current && !step.done && 'border-primary/35 bg-primary/5',
          !step.done && !current && 'border-border bg-card/70',
        )}
      >
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary">
          {step.done ? <CheckCircle2 size={16} /> : current ? <CircleDot size={16} /> : <Circle size={16} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <Icon className="size-4 text-muted-foreground" />
            <span className="font-black text-foreground">{step.title}</span>
          </span>
          <span className="mt-1 block text-sm leading-6 text-muted-foreground">{step.detail}</span>
        </span>
        <span className="hidden shrink-0 items-center gap-1 text-xs font-black text-primary md:flex">
          {step.done ? 'Done' : step.cta}
          <ArrowUpRight size={13} className="opacity-60 group-hover:opacity-100" />
        </span>
      </Link>
    </li>
  )
}

function ActivationStat({
  label,
  value,
  detail,
  Icon,
}: {
  label: string
  value: string
  detail: string
  Icon: LucideIcon
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">{label}</p>
          <strong className="mt-1 block text-2xl font-black text-foreground">{value}</strong>
        </div>
        <Icon className="size-5 text-primary" />
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  )
}

function MigrationSourceList() {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-black">Switching kit</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Move customers from scattered selling channels into one retention workspace without waiting for native integrations.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/imports">
            Import
            <ArrowUpRight size={15} />
          </Link>
        </Button>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {migrationSources.map((source) => (
          <Link
            key={source.channel}
            href="/imports"
            className="tree-tactile group rounded-lg border border-border bg-card/80 p-3 hover:bg-card focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-black text-foreground">{channelLabels[source.channel]}</p>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{source.detail}</p>
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function getNextAction({
  hasImport,
  hasRepeatCustomers,
  hasWinbackQueue,
  hasSyncSetup,
}: {
  hasImport: boolean
  hasRepeatCustomers: boolean
  hasWinbackQueue: boolean
  hasSyncSetup: boolean
}): NextAction {
  if (!hasImport) {
    return {
      title: 'Import 20-50 real orders first',
      detail: 'A small real export is enough to prove identity matching, repeat detection, and the first retention view.',
      href: '/imports',
      cta: 'Import orders',
    }
  }

  if (!hasRepeatCustomers) {
    return {
      title: 'Import older history to reveal second purchases',
      detail: 'Recent orders alone often hide repeat behavior. Add prior months so the system can find second-order paths.',
      href: '/imports',
      cta: 'Add history',
    }
  }

  if (hasWinbackQueue && hasSyncSetup) {
    return {
      title: 'Expand from reporting into operating cadence',
      detail: 'Review repeat buyers weekly, refresh win-back focus, and keep source-channel repeat paths current.',
      href: '/analytics',
      cta: 'Open analytics',
    }
  }

  if (hasWinbackQueue) {
    return {
      title: 'Open the win-back queue before adding new features',
      detail: 'The fastest revenue recovery is usually buyers who already trusted the store and stopped buying.',
      href: buildCustomersHref({ segment: 'winback', sort: 'lastOrder' }),
      cta: 'Open queue',
    }
  }

  if (!hasSyncSetup) {
    return {
      title: 'Schedule recurring CSV sync',
      detail: 'Once the first import is clean, connect a CSV URL so operators do not have to rebuild reports manually.',
      href: '/income?tab=sync',
      cta: 'Set sync',
    }
  }

  return {
    title: 'Expand from reporting into operating cadence',
    detail: 'Review repeat buyers weekly, refresh win-back focus, and keep source-channel repeat paths current.',
    href: '/analytics',
    cta: 'Open analytics',
  }
}
