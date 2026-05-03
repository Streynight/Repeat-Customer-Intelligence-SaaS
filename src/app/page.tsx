import Link from 'next/link'
import type React from 'react'
import { ArrowRight, CalendarDays, CheckCircle2, CircleDollarSign, Database, LineChart, Repeat2, ShieldCheck, Upload, Users } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const workflow = [
  {
    title: 'Import orders',
    body: 'CSV today, native integrations as each channel is ready.',
    icon: Upload,
    href: '/imports',
  },
  {
    title: 'Resolve customers',
    body: 'Merge email, phone, LINE ID, and channel identity signals.',
    icon: Users,
    href: '/customers',
  },
  {
    title: 'Act on repeat value',
    body: 'Prioritize VIP protection, second purchase, and win-back work.',
    icon: Repeat2,
    href: '/dashboard',
  },
]

const checks = ['Tenant-scoped imports', 'Billing-aware usage', 'Retry-safe jobs', 'Health checks live']

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <BrandLogo />
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">
                Open workspace
                <ArrowRight size={16} />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[1fr_520px] lg:px-8 lg:py-14">
        <div className="flex flex-col justify-center">
          <Badge variant="secondary" className="w-fit border-primary/20 bg-primary/10 text-primary">
            Operator-grade retention SaaS
          </Badge>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
            Repeat Customer Intelligence
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            A production workspace for merchants who need retained revenue, channel quality, customer risk, and automation readiness from real order data.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/signup">
                Start with real data
                <ArrowRight size={17} />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
          <div className="mt-8 grid gap-2 sm:grid-cols-2">
            {checks.map((check) => (
              <div key={check} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CheckCircle2 className="size-4 text-primary" />
                {check}
              </div>
            ))}
          </div>
        </div>

        <ProductPreview />
      </section>

      <section className="border-y border-border bg-card/70">
        <div className="mx-auto grid max-w-7xl gap-3 px-5 py-5 md:grid-cols-3 lg:px-8">
          {workflow.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group rounded-lg border border-border bg-card p-4 transition hover:border-primary/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <item.icon size={18} />
                  </span>
                  <h2 className="mt-3 font-semibold">{item.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.body}</p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}

function ProductPreview() {
  return (
    <section aria-label="RepeatTree product preview" className="rounded-lg border border-border bg-card shadow-lg">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Workspace</p>
          <h2 className="font-semibold">Retention command center</h2>
        </div>
        <Badge variant="secondary">No demo data</Badge>
      </div>

      <div className="grid gap-3 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <PreviewMetric icon={<CircleDollarSign />} label="Repeat revenue" value="0 until import" tone="text-cyan-700" />
          <PreviewMetric icon={<Repeat2 />} label="Repeat rate" value="Calculated" tone="text-emerald-700" />
          <PreviewMetric icon={<ShieldCheck />} label="Risk value" value="Tracked" tone="text-rose-700" />
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
          <div className="rounded-lg border border-border p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Readiness path</p>
                <h3 className="font-semibold">Import to action</h3>
              </div>
              <LineChart className="size-5 text-primary" />
            </div>
            <div className="space-y-3">
              <PreviewBar label="CSV validation" value="Ready" width="92%" className="bg-primary" />
              <PreviewBar label="Customer resolution" value="Scoped" width="72%" className="bg-cyan-500" />
              <PreviewBar label="Automation events" value="Queued" width="58%" className="bg-violet-500" />
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Automation queue</p>
            <div className="mt-3 space-y-3 text-sm">
              <PreviewQueue icon={<Database />} label="CSV sync" status="Tenant" />
              <PreviewQueue icon={<CalendarDays />} label="Win-back" status="Event" />
              <PreviewQueue icon={<Users />} label="VIP review" status="Rule" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PreviewMetric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: string
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className={tone}>{icon}</div>
      <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <strong className="block text-lg font-semibold tracking-tight">{value}</strong>
    </div>
  )
}

function PreviewBar({ label, value, width, className }: { label: string; value: string; width: string; className: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${className}`} style={{ width }} />
      </div>
    </div>
  )
}

function PreviewQueue({ icon, label, status }: { icon: React.ReactNode; label: string; status: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-muted-foreground">
        <span className="grid size-7 place-items-center rounded-md bg-muted text-foreground">{icon}</span>
        {label}
      </span>
      <Badge variant="outline">{status}</Badge>
    </div>
  )
}
