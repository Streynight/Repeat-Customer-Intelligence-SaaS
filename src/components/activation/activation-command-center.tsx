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
import {
  activationMigrationSources,
  buildActivationState,
  type ActivationStepId,
  type ActivationStepState,
} from '@/lib/services/activation'
import { channelLabels, type IntelligenceDataset } from '@/lib/types'
import { useText } from '@/lib/i18n'
import { cn, money, percent } from '@/lib/utils'

type ActivationCommandCenterProps = {
  dataset: IntelligenceDataset
  compact?: boolean
  csvSyncConnectionCount?: number
  layout?: 'wide' | 'rail'
  className?: string
}

const stepIcons: Record<ActivationStepId, LucideIcon> = {
  import: FileUp,
  identity: GitMerge,
  repeat: Repeat2,
  winback: CalendarClock,
  sync: PlugZap,
}

export function ActivationCommandCenter({
  dataset,
  compact = false,
  csvSyncConnectionCount = 0,
  layout = 'wide',
  className,
}: ActivationCommandCenterProps) {
  const t = useText()
  const activation = buildActivationState(dataset, { csvSyncConnectionCount })
  const { completedSteps, nextAction, progress, steps } = activation
  const currentStep = steps.find((step) => !step.done) ?? steps[steps.length - 1]

  return (
    <Card className={cn('border-primary/15 bg-card', className)}>
      <CardHeader className="gap-3 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Store size={12} />
              {t('Migration command center')}
            </Badge>
            <Badge variant={completedSteps === steps.length ? 'default' : 'outline'}>
              {completedSteps}/{steps.length} {t('activated')}
            </Badge>
          </div>
          <CardTitle className="mt-3 text-lg">{t('Turn imported orders into repeat revenue')}</CardTitle>
          <CardDescription className="mt-1 max-w-3xl leading-6">
            {t('Guide new accounts from their first marketplace export to buyer identity, repeat revenue, win-back focus, and recurring automation.')}
          </CardDescription>
        </div>
        <div className="rounded-lg border border-border bg-secondary/35 p-3 md:min-w-48">
          <p className="text-xs font-black uppercase text-muted-foreground">{t('Activation progress')}</p>
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
                <p className="text-xs font-black uppercase text-primary">{t('Next best action')}</p>
                <h3 className="mt-1 font-black text-foreground">{t(nextAction.title)}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{t(nextAction.detail)}</p>
              </div>
              <Button asChild>
                <Link href={nextAction.href}>
                  {t(nextAction.cta)}
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
            <ActivationStat label="Known buyers" value={activation.totalCustomers.toLocaleString()} detail={`${activation.contactsWithIdentity.toLocaleString()} ${t('with contact identity')}`} Icon={Users} />
            <ActivationStat label="Repeat revenue" value={money(activation.repeatRevenue)} detail={`${activation.repeatCustomers.toLocaleString()} ${t('repeat buyers,')} ${percent(activation.repeatRate)} ${t('repeat rate')}`} Icon={Repeat2} />
            <ActivationStat label="Win-back value" value={money(activation.atRiskValue)} detail={`${activation.atRiskCustomerCount.toLocaleString()} ${t('at-risk or lost buyers')}`} Icon={ShieldCheck} />
          </div>

          {!compact ? (
            <MigrationSourceList />
          ) : (
            <div className="rounded-lg border border-border bg-secondary/30 p-4">
              <div className="flex items-start gap-3">
                <Database className="mt-0.5 size-4 text-primary" />
                <div>
                  <h3 className="font-black">{t('Switching kit')}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {t('Shopee, TikTok Shop, Instagram, Facebook, website, and custom CSV exports all start from the same import path.')}
                  </p>
                  <Button asChild variant="outline" className="mt-3">
                    <Link href="/imports">
                      {t('Open import path')}
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

function ActivationStepRow({ step, current }: { step: ActivationStepState; current: boolean }) {
  const t = useText()
  const Icon = stepIcons[step.id]

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
            <span className="font-black text-foreground">{t(step.title)}</span>
          </span>
          <span className="mt-1 block text-sm leading-6 text-muted-foreground">{t(step.detail)}</span>
        </span>
        <span className="hidden shrink-0 items-center gap-1 text-xs font-black text-primary md:flex">
          {step.done ? t('Done') : t(step.cta)}
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
  const t = useText()

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">{t(label)}</p>
          <strong className="mt-1 block text-2xl font-black text-foreground">{value}</strong>
        </div>
        <Icon className="size-5 text-primary" />
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  )
}

function MigrationSourceList() {
  const t = useText()

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-black">{t('Switching kit')}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {t('Move customers from scattered selling channels into one retention workspace without waiting for native integrations.')}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/imports">
            {t('Import')}
            <ArrowUpRight size={15} />
          </Link>
        </Button>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {activationMigrationSources.map((source) => (
          <Link
            key={source.channel}
            href="/imports"
            className="tree-tactile group rounded-lg border border-border bg-card/80 p-3 hover:bg-card focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-black text-foreground">{t(channelLabels[source.channel])}</p>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{t(source.detail)}</p>
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
