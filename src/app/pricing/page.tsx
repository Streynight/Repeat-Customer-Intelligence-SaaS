import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRight, CheckCircle2, Database, LineChart, LockKeyhole, Users } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'
import { LanguageSwitcher } from '@/components/language-switcher'
import { LocalizedText } from '@/components/localized-text'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { orderedPlans, planCatalog, type PlanId } from '@/lib/billing/plans'
import { type BillingCheckoutPlan } from '@/lib/billing/checkout'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Pricing | RepeatTree',
  description: 'Self-serve pricing for RepeatTree repeat customer intelligence.',
}

const selfServePlans = orderedPlans.filter((plan): plan is BillingCheckoutPlan => plan !== 'enterprise')

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const checkoutState = firstQueryValue((await searchParams).checkout)

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" aria-label="RepeatTree home">
            <BrandLogo />
          </Link>
          <nav className="flex items-center gap-2">
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <Button asChild variant="ghost">
              <Link href="/login"><LocalizedText text="Sign in" /></Link>
            </Button>
            <Button asChild>
              <Link href="/signup"><LocalizedText text="Open workspace" /></Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary">
            <LocalizedText text="Self-serve pricing" />
          </Badge>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-6xl">
            <LocalizedText text="Turn repeat customer data into paid work." />
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            <LocalizedText text="Start with a 7-day Growth trial through Stripe Checkout, or choose a paid plan when you already know your volume." />
          </p>
        </div>

        {checkoutState ? <CheckoutNotice state={checkoutState} /> : null}

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {selfServePlans.map((plan) => (
            <PlanCard key={plan} plan={plan} featured={plan === 'growth'} />
          ))}
        </div>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="rounded-lg border border-border bg-card/70 p-5">
            <h2 className="text-lg font-semibold"><LocalizedText text="What customers pay for" /></h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <ValuePoint icon={<LineChart className="size-5" />} title="Repeat revenue" body="See who buys again and which channel keeps value." />
              <ValuePoint icon={<Database className="size-5" />} title="Clean imports" body="Upload marketplace files without rebuilding the sheet first." />
              <ValuePoint icon={<Users className="size-5" />} title="Team workflow" body="Share projects, tasks, and workspace access with teammates." />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card/70 p-5">
            <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <LockKeyhole className="size-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold"><LocalizedText text="Trial before billing" /></h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              <LocalizedText text="Growth includes a short trial for real import testing. Starter and Scale use paid checkout to keep production capacity controlled." />
            </p>
          </div>
        </section>
      </section>
    </main>
  )
}

function PlanCard({ plan, featured }: { plan: BillingCheckoutPlan; featured?: boolean }) {
  const entry = planCatalog[plan]
  const hasTrial = entry.trialDays > 0

  return (
    <Card className={cn(featured && 'border-primary/50 shadow-primary/10')}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl"><LocalizedText text={entry.name} /></CardTitle>
            <CardDescription className="mt-2 leading-6"><LocalizedText text={entry.positioning} /></CardDescription>
          </div>
          {featured ? <Badge><LocalizedText text="Best default" /></Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div>
          <span className="text-3xl font-semibold tracking-tight">{formatThb(entry.priceMonthlyThb)}</span>
          <span className="ml-1 text-sm text-muted-foreground">/<LocalizedText text="mo" /></span>
        </div>
        {hasTrial ? (
          <p className="mt-2 text-sm font-semibold text-primary">
            <LocalizedText text={trialLabel(entry.trialDays)} />
          </p>
        ) : null}
        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          <PlanLimit label="Monthly orders" value={entry.monthlyOrders.toLocaleString()} />
          <PlanLimit label="DB storage" value={formatStorageMb(entry.databaseStorageMb)} />
          <PlanLimit label="Team seats" value={entry.users.toLocaleString()} />
          <PlanLimit label="Workspaces" value={entry.workspaces.toLocaleString()} />
        </div>
        <ul className="mt-5 grid gap-2 text-sm">
          {entry.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              <span><LocalizedText text={feature} /></span>
            </li>
          ))}
        </ul>
        <Button asChild className="mt-6 w-full font-semibold">
          <Link href={checkoutHref(plan)}>
            <LocalizedText text={hasTrial ? 'Start free trial' : 'Start paid plan'} />
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="ghost" className="mt-2 w-full">
          <Link href={`/login?next=${encodeURIComponent(checkoutHref(plan))}`}>
            <LocalizedText text="Already have an account?" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function ValuePoint({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="text-primary">{icon}</div>
      <h3 className="mt-3 font-semibold"><LocalizedText text={title} /></h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground"><LocalizedText text={body} /></p>
    </div>
  )
}

function CheckoutNotice({ state }: { state: string }) {
  const text = state === 'cancelled'
    ? 'Checkout was cancelled. Choose a plan when ready.'
    : state === 'invalid'
      ? 'Choose a valid self-serve plan.'
      : 'Checkout could not start. Try again or use billing settings after signing in.'

  return (
    <div className="mt-6 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
      <LocalizedText text={text} />
    </div>
  )
}

function PlanLimit({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span><LocalizedText text={label} /></span>
      <strong className="text-foreground">{value}</strong>
    </div>
  )
}

function checkoutHref(plan: PlanId) {
  return `/billing/checkout?plan=${encodeURIComponent(plan)}`
}

function trialLabel(days: number) {
  return `${days}-day free trial`
}

function formatThb(value: number | null) {
  if (value === null) return 'Custom'
  return `฿${value.toLocaleString('th-TH')}`
}

function formatStorageMb(value: number) {
  if (value >= 1024) return `${Math.round(value / 1024).toLocaleString()}GB`
  return `${value.toLocaleString()}MB`
}

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}
