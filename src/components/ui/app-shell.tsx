'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BarChart3, CalendarDays, CircleDollarSign, LineChart, LogOut, Menu, Settings, ShieldCheck, Upload, Users } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { createClient } from '@/lib/supabase/client'
import { hasSupabaseRuntimeConfig } from '@/lib/runtime-config'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/analytics', label: 'Analytics', icon: LineChart },
  { href: '/income', label: 'Income', icon: CircleDollarSign },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/imports', label: 'Imports', icon: Upload },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/admin', label: 'Admin', icon: ShieldCheck },
]

const hasSupabase = hasSupabaseRuntimeConfig()

function UserMenu() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!hasSupabase) return
    const supabase = createClient()
    supabase.auth
      .getUser()
      .then(({ data }) => {
        setEmail(data.user?.email ?? null)
      })
      .catch(() => {
        setEmail(null)
      })
  }, [])

  if (!hasSupabase || !email) return null

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="absolute bottom-4 left-3 right-3 rounded-lg border border-border bg-card/80 p-3 shadow-sm">
      <p className="truncate text-xs font-semibold text-muted-foreground">{email}</p>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void signOut()}
        className="mt-2 h-7 justify-start px-0 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <LogOut size={13} />
        Sign out
      </Button>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,var(--background)_0%,var(--muted)_100%)] text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-sidebar-border bg-sidebar/95 shadow-lg shadow-stone-200/60 lg:block">
        <BrandBlock />
        <DesktopNav />
        <UserMenu />
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/90 px-5 py-3 shadow-sm backdrop-blur lg:hidden">
          <Link href="/" aria-label="RepeatTree home">
            <BrandLogo markClassName="size-8" textClassName="text-base" />
          </Link>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open navigation">
                <Menu size={17} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle>
                  <BrandLogo />
                </SheetTitle>
              </SheetHeader>
              <MobileNav />
            </SheetContent>
          </Sheet>
        </header>
        <main className="mx-auto max-w-7xl px-5 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-border/75 bg-card/55 p-5 shadow-sm shadow-stone-200/60 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="inline-flex rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-xs font-black uppercase text-primary">
          <span className="mr-1.5 inline-block size-1.5 rounded-full bg-accent" aria-hidden="true" />
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}

function BrandBlock() {
  return (
    <div className="border-b border-sidebar-border bg-gradient-to-br from-sidebar via-secondary/55 to-accent/35 px-6 py-5">
      <Link href="/" aria-label="RepeatTree home">
        <BrandLogo />
      </Link>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">Repeat Customer Intelligence</p>
    </div>
  )
}

function DesktopNav() {
  const pathname = usePathname()

  return (
    <nav className="grid gap-1 px-3 py-4">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-sm',
              active && 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm shadow-stone-200/60 ring-1 ring-sidebar-border',
            )}
          >
            {active ? <span className="absolute left-0 top-2 h-5 w-1 rounded-r-full bg-accent" /> : null}
            <item.icon size={17} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function MobileNav() {
  const pathname = usePathname()

  return (
    <div className="px-4">
      <Separator />
      <nav className="mt-4 grid gap-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <SheetClose asChild key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  active && 'bg-accent text-accent-foreground',
                )}
              >
                {active ? <span className="absolute left-0 top-2 h-5 w-1 rounded-r-full bg-primary" /> : null}
                <item.icon size={17} />
                {item.label}
              </Link>
            </SheetClose>
          )
        })}
      </nav>
    </div>
  )
}
