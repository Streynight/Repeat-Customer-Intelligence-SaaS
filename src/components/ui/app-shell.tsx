'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BarChart3, BookOpenCheck, CalendarDays, CircleDollarSign, FolderKanban, LineChart, LogOut, Menu, Settings, ShieldCheck, Upload, Users } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'
import { LanguageSwitcher } from '@/components/language-switcher'
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
import { useText } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/analytics', label: 'Analytics', icon: LineChart },
  { href: '/income', label: 'Income', icon: CircleDollarSign },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/imports', label: 'Imports', icon: Upload },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/tutorials', label: 'Tutorials', icon: BookOpenCheck },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/admin', label: 'Admin', icon: ShieldCheck },
]

const hasSupabase = hasSupabaseRuntimeConfig()

function UserMenu() {
  const router = useRouter()
  const t = useText()
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
    <div className="absolute bottom-4 left-3 right-3 rounded-lg border border-sidebar-border bg-sidebar-accent/70 p-3">
      <p className="truncate text-xs font-semibold text-sidebar-foreground/70">{email}</p>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void signOut()}
        className="mt-2 h-7 justify-start px-0 text-xs font-semibold text-sidebar-foreground/70 hover:bg-transparent hover:text-sidebar-foreground"
      >
        <LogOut size={13} />
        {t('Sign out')}
      </Button>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useText()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block">
        <BrandBlock />
        <DesktopNav />
        <UserMenu />
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/90 px-5 py-3 shadow-sm backdrop-blur lg:hidden">
          <Link href="/" aria-label={t('RepeatTree home')}>
            <BrandLogo markClassName="size-8" textClassName="text-base" />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label={t('Open navigation')}>
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
          </div>
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
  const t = useText()

  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-black uppercase text-primary">
          <span className="mr-1.5 inline-block size-1.5 rounded-full bg-primary" aria-hidden="true" />
          {t(eyebrow)}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{t(title)}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t(description)}</p>
      </div>
      {action}
    </div>
  )
}

function BrandBlock() {
  const t = useText()

  return (
    <div className="border-b border-sidebar-border px-6 py-5">
      <Link href="/" aria-label={t('RepeatTree home')}>
        <BrandLogo textClassName="text-sidebar-foreground" />
      </Link>
      <p className="mt-2 text-xs leading-5 text-sidebar-foreground/65">{t('Repeat Customer Intelligence')}</p>
      <LanguageSwitcher className="mt-4 border-sidebar-border bg-sidebar-accent/70" />
    </div>
  )
}

function DesktopNav() {
  const pathname = usePathname()
  const t = useText()

  return (
    <nav className="grid gap-1 px-3 py-4">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-sidebar-foreground/68 transition',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              active && 'bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-sidebar-border',
            )}
          >
            {active ? <span className="absolute left-0 top-2 h-5 w-1 rounded-r-full bg-sidebar-primary" /> : null}
            <item.icon size={17} />
            {t(item.label)}
          </Link>
        )
      })}
    </nav>
  )
}

function MobileNav() {
  const pathname = usePathname()
  const t = useText()

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
                {t(item.label)}
              </Link>
            </SheetClose>
          )
        })}
      </nav>
    </div>
  )
}
