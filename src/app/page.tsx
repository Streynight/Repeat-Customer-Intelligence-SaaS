import Link from 'next/link'
import { ArrowRight, GitBranch, Leaf, ReceiptText, Repeat2, ShieldCheck, Sprout, Upload } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,var(--background)_0%,var(--muted)_100%)] text-foreground">
      <section className="mx-auto grid min-h-screen max-w-6xl content-center gap-8 px-6 py-12">
        <div className="rounded-3xl border border-primary/10 bg-card/65 p-6 shadow-xl shadow-stone-200/65 md:p-10">
          <BrandLogo className="mb-4 flex" markClassName="size-10" textClassName="text-xl" />
          <div className="grid gap-8 lg:grid-cols-[1fr_390px] lg:items-end">
            <div>
              <Badge variant="secondary" className="border-primary/10 bg-accent/45 text-accent-foreground">
                <Leaf size={12} />
                Repeat Customer Intelligence SaaS
              </Badge>
              <h1 className="mt-5 max-w-4xl text-5xl font-black tracking-tight md:text-6xl">
                Grow repeat customers from the orders you already have.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                CSV-first analytics for Shopee, TikTok Shop, Instagram, Facebook, website, and custom order exports. RepeatTree shows who buys again, where they came from, and which channels grow lifetime value.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="font-black">
                  <Link href="/signup">
                    Open dashboard
                    <ArrowRight size={17} />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="font-black">
                  <Link href="/login">Login</Link>
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-gradient-to-br from-secondary/60 via-card to-accent/25 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Sprout size={20} />
                </span>
                <div>
                  <p className="text-xs font-black uppercase text-primary">Today’s growth loop</p>
                  <p className="text-sm text-muted-foreground">Import, spot repeat buyers, act.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-2">
                {['Repeat buyer found', 'VIP threshold crossed', 'Win-back due soon'].map((item, index) => (
                  <div key={item} className="flex items-center justify-between rounded-xl border border-border bg-card/80 px-3 py-2">
                    <span className="text-sm font-bold">{item}</span>
                    <Badge variant={index === 1 ? 'secondary' : 'outline'}>{index === 0 ? 'Sage' : index === 1 ? 'Gold' : 'Clay'}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <Card className="border-primary/15 bg-gradient-to-br from-card via-secondary/55 to-accent/30">
          {[
            ['Upload orders', 'Import CSV first. APIs come later.', Upload, '/imports'],
            ['Resolve duplicates', 'Merge phone, email, LINE ID, and fuzzy names.', ShieldCheck, '/customers'],
            ['Rank repeat value', 'See VIPs, at-risk buyers, and channel repeat revenue.', Repeat2, '/dashboard'],
            ['Analyze cohorts', 'Open RFM, cohorts, product repeat paths, and opportunity lists.', GitBranch, '/analytics'],
            ['Track income', 'Review gross income, net snapshot, VAT estimates, and CSV auto-sync.', ReceiptText, '/income'],
          ].map(([title, body, Icon, href]) => (
            <Link
              key={String(title)}
              href={href as string}
              className="group block border-b border-border py-5 transition first:pt-0 last:border-b-0 last:pb-0 hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Icon className="text-primary" size={22} />
                  <h2 className="mt-3 font-black">{title as string}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{body as string}</p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary" />
              </div>
            </Link>
          ))}
        </Card>
      </section>
    </main>
  )
}
