import Link from 'next/link'
import { ArrowRight, Repeat2, ShieldCheck, Upload } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto grid min-h-screen max-w-6xl content-center gap-12 px-6 py-16 lg:grid-cols-[1fr_440px] lg:items-center">
        <div>
          <BrandLogo className="mb-4 flex" markClassName="size-10" textClassName="text-xl" />
          <Badge variant="secondary">Repeat Customer Intelligence SaaS</Badge>
          <h1 className="mt-5 max-w-4xl text-5xl font-black tracking-tight md:text-6xl">
            Know who buys again, where they came from, and which channel creates repeat revenue.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            CSV-first analytics for Shopee, TikTok Shop, Instagram, Facebook, website, and custom order exports. Built for small ecommerce merchants, not generic CRM teams.
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
        <Card className="border-primary/15 bg-gradient-to-br from-card via-secondary/55 to-accent/35">
          {[
            ['Upload orders', 'Import CSV first. APIs come later.', Upload, '/imports'],
            ['Resolve duplicates', 'Merge phone, email, LINE ID, and fuzzy names.', ShieldCheck, '/customers'],
            ['Rank repeat value', 'See VIPs, at-risk buyers, and channel repeat revenue.', Repeat2, '/dashboard'],
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
