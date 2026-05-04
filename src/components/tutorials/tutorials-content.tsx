'use client'

import Link from 'next/link'
import { ArrowRight, CalendarDays, CheckCircle2, CircleDollarSign, FileSpreadsheet, Gauge, LifeBuoy, Repeat2, Settings, UploadCloud, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useText } from '@/lib/i18n'

type TutorialStep = {
  number: string
  title: string
  outcome: string
  detail: string
  href: string
  cta: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  tone: 'primary' | 'repeat' | 'income' | 'risk' | 'vip'
}

const firstRunSteps: TutorialStep[] = [
  {
    number: '01',
    title: 'Import real orders',
    outcome: 'Your workspace has customer, order, revenue, and import history.',
    detail: 'Go to Imports, upload one CSV export, choose the source channel, and keep order ID, customer name, order date, and total amount mapped before confirming.',
    href: '/imports',
    cta: 'Open imports',
    icon: UploadCloud,
    tone: 'primary',
  },
  {
    number: '02',
    title: 'Check identity signals',
    outcome: 'Repeat buyers merge instead of becoming duplicates.',
    detail: 'Prefer phone or email columns when available. LINE ID and customer name help, but phone and email are stronger for cross-channel matching.',
    href: '/imports',
    cta: 'Review mapping',
    icon: FileSpreadsheet,
    tone: 'vip',
  },
  {
    number: '03',
    title: 'Read the dashboard first',
    outcome: 'You know repeat revenue, repeat rate, VIP count, and win-back risk.',
    detail: 'Start with the top cards and action links. They point to the exact customer list behind each metric, so the team can act instead of only reading charts.',
    href: '/dashboard',
    cta: 'Open dashboard',
    icon: Gauge,
    tone: 'repeat',
  },
  {
    number: '04',
    title: 'Work the customer queues',
    outcome: 'VIP, repeat, and at-risk buyers become owned follow-up lists.',
    detail: 'Use Customers to filter repeat buyers, VIPs, and stale customers. Open a buyer profile when you need the order trail before contacting them.',
    href: '/customers',
    cta: 'Open customers',
    icon: Users,
    tone: 'risk',
  },
  {
    number: '05',
    title: 'Use timing, not guessing',
    outcome: 'Follow-up work happens around the next likely purchase window.',
    detail: 'Use Calendar after imports create enough order history. Prioritize upcoming repeat windows and stale customers before broad campaigns.',
    href: '/calendar',
    cta: 'Open calendar',
    icon: CalendarDays,
    tone: 'vip',
  },
  {
    number: '06',
    title: 'Verify money and settings',
    outcome: 'Revenue views match how your business reports gross, fees, refunds, and tax.',
    detail: 'Use Income for revenue checks and Settings for workspace controls. Keep billing and usage healthy before adding more channels.',
    href: '/income',
    cta: 'Open income',
    icon: CircleDollarSign,
    tone: 'income',
  },
]

const csvFields = [
  'order_id',
  'customer_name',
  'phone or email',
  'order_date',
  'total_amount',
  'product_name',
  'source channel',
]

const weeklyRhythm = [
  'Import the latest orders or confirm native sync completed.',
  'Open Dashboard and pick the highest-value action link first.',
  'Review Customers filtered to VIP, Repeat, and Need win-back.',
  'Use Calendar to time follow-ups before customers become stale.',
  'Check Income when tax, fees, refunds, or channel totals look wrong.',
]

const toneClasses: Record<TutorialStep['tone'], {
  border: string
  icon: string
  label: string
}> = {
  primary: {
    border: 'border-primary/25 bg-card',
    icon: 'bg-primary/10 text-primary',
    label: 'text-primary',
  },
  repeat: {
    border: 'border-emerald-200/80 bg-emerald-50/70',
    icon: 'bg-emerald-100 text-emerald-800',
    label: 'text-emerald-800',
  },
  income: {
    border: 'border-cyan-200/80 bg-cyan-50/70',
    icon: 'bg-cyan-100 text-cyan-800',
    label: 'text-cyan-800',
  },
  risk: {
    border: 'border-rose-200/80 bg-rose-50/70',
    icon: 'bg-rose-100 text-rose-800',
    label: 'text-rose-800',
  },
  vip: {
    border: 'border-violet-200/80 bg-violet-50/70',
    icon: 'bg-violet-100 text-violet-800',
    label: 'text-violet-800',
  },
}

export function TutorialsContent() {
  const t = useText()

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-card">
        <CardHeader className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary">{t('First 15 minutes')}</Badge>
            <CardTitle className="mt-3 text-2xl font-semibold">{t('From empty workspace to action list')}</CardTitle>
            <CardDescription className="mt-2 max-w-3xl leading-6">
              {t('RepeatTree becomes useful after real order data is imported. Start with one clean export, confirm the import diagnostics, then move from dashboard metrics into customer queues.')}
            </CardDescription>
          </div>
          <Button asChild className="w-full font-black sm:w-fit">
            <Link href="/imports">
              {t('Start tutorial')}
              <ArrowRight size={16} />
            </Link>
          </Button>
        </CardHeader>
      </Card>

      <section aria-labelledby="first-run-title">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="first-run-title" className="text-xl font-semibold tracking-tight">{t('Step-by-step setup')}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{t('Run these in order for a new merchant workspace.')}</p>
          </div>
          <Badge variant="outline">{t('Operator workflow')}</Badge>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {firstRunSteps.map((step) => (
            <TutorialStepCard key={step.number} step={step} />
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>{t('CSV file checklist')}</CardTitle>
            <CardDescription>{t('Use this before uploading an export. Missing optional fields are allowed, but weak identity fields reduce matching quality.')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {csvFields.map((field) => (
              <div key={field} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/35 px-3 py-2 text-sm font-semibold">
                <CheckCircle2 className="size-4 text-primary" />
                {t(field)}
              </div>
            ))}
          </CardContent>
        </Card>

        <Alert className="border-rose-200 bg-rose-50 text-rose-950">
          <LifeBuoy size={16} />
          <AlertTitle>{t('When the dashboard is empty')}</AlertTitle>
          <AlertDescription>
            {t('Empty metrics usually mean no orders are imported yet. Go to Imports, try a sample only for validation, then import real orders for the customer workspace.')}
          </AlertDescription>
        </Alert>
      </div>

      <Card>
        <CardHeader className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <CardTitle>{t('Weekly operating rhythm')}</CardTitle>
            <CardDescription>{t('Use this after the first import so the workspace drives retention work instead of becoming a passive report.')}</CardDescription>
          </div>
          <Button asChild variant="outline" className="w-full font-black sm:w-fit">
            <Link href="/customers">
              {t('Open action queues')}
              <ArrowRight size={16} />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3 lg:grid-cols-5">
            {weeklyRhythm.map((item, index) => (
              <li key={item} className="rounded-lg border border-border bg-card px-3 py-3 text-sm leading-6 shadow-sm">
                <span className="mb-2 inline-flex size-6 items-center justify-center rounded-lg bg-primary/10 text-xs font-black text-primary">
                  {index + 1}
                </span>
                <p>{t(item)}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <QuickLink href="/analytics" title="Understand repeat patterns" detail="Use cohorts, RFM, and product repeat views when dashboard numbers need explanation." icon={Repeat2} />
        <QuickLink href="/settings" title="Tune workspace settings" detail="Adjust classification and workspace controls after the team agrees on operating thresholds." icon={Settings} />
        <QuickLink href="/income" title="Validate revenue reporting" detail="Check gross, net, fees, refunds, and tax before sharing numbers with finance." icon={CircleDollarSign} />
      </div>
    </div>
  )
}

function TutorialStepCard({ step }: { step: TutorialStep }) {
  const t = useText()
  const tone = toneClasses[step.tone]
  const Icon = step.icon

  return (
    <Link
      href={step.href}
      className="group block rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
    >
      <Card className={`h-full transition group-hover:-translate-y-0.5 group-hover:shadow-md ${tone.border}`}>
        <CardHeader className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-start">
          <span className={`grid size-10 place-items-center rounded-lg ${tone.icon}`}>
            <Icon size={18} />
          </span>
          <div>
            <p className={`text-xs font-black uppercase ${tone.label}`}>{step.number}</p>
            <CardTitle>{t(step.title)}</CardTitle>
          </div>
          <ArrowRight className="hidden size-4 text-muted-foreground group-hover:text-primary sm:block" />
        </CardHeader>
        <CardContent>
          <p className="text-sm font-semibold text-foreground">{t(step.outcome)}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(step.detail)}</p>
          <span className="mt-4 inline-flex text-sm font-black text-primary">
            {t(step.cta)}
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}

function QuickLink({
  href,
  title,
  detail,
  icon: Icon,
}: {
  href: string
  title: string
  detail: string
  icon: React.ComponentType<{ size?: number }>
}) {
  const t = useText()

  return (
    <Link href={href} className="group rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45">
      <Card className="h-full border-primary/10 bg-card transition group-hover:-translate-y-0.5 group-hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon size={17} />
          </span>
          <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">{t(title)}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(detail)}</p>
        </div>
      </Card>
    </Link>
  )
}
