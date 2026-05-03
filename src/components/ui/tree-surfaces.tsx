import Link from 'next/link'
import type React from 'react'
import { ArrowUpRight, Radar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type AccentTone = 'neutral' | 'repeat' | 'vip' | 'risk' | 'income'

const toneClasses: Record<AccentTone, {
  panel: string
  icon: string
  text: string
  strip: string
}> = {
  neutral: {
    panel: 'border-primary/20 bg-card',
    icon: 'bg-primary/10 text-primary',
    text: 'text-primary',
    strip: 'bg-primary',
  },
  repeat: {
    panel: 'border-emerald-200/80 bg-emerald-50/70',
    icon: 'bg-emerald-100 text-emerald-800',
    text: 'text-emerald-800',
    strip: 'bg-emerald-600',
  },
  vip: {
    panel: 'border-violet-200/80 bg-violet-50/70',
    icon: 'bg-violet-100 text-violet-800',
    text: 'text-violet-800',
    strip: 'bg-violet-600',
  },
  risk: {
    panel: 'border-rose-200/80 bg-rose-50/70',
    icon: 'bg-rose-100 text-rose-800',
    text: 'text-rose-800',
    strip: 'bg-rose-600',
  },
  income: {
    panel: 'border-cyan-200/80 bg-cyan-50/70',
    icon: 'bg-cyan-100 text-cyan-800',
    text: 'text-cyan-800',
    strip: 'bg-cyan-600',
  },
}

export function toneClass(tone: AccentTone) {
  return toneClasses[tone]
}

export function TreeSprout({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
        className={cn(
        'grid size-10 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-sm',
        className,
      )}
    >
      <Radar className="size-5" />
    </span>
  )
}

export function TreeEmptyState({
  title,
  description,
  action,
  secondaryAction,
  tone = 'neutral',
}: {
  title: string
  description: string
  action: { href: string; label: string; icon?: React.ReactNode }
  secondaryAction?: { href: string; label: string; icon?: React.ReactNode }
  tone?: AccentTone
}) {
  const toneStyle = toneClasses[tone]

  return (
    <Card className={cn('relative overflow-hidden', toneStyle.panel)}>
      <span className={cn('absolute inset-x-0 top-0 h-1', toneStyle.strip)} aria-hidden="true" />
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start">
        <TreeSprout />
        <div>
          <CardTitle className="text-2xl font-semibold">{title}</CardTitle>
          <CardDescription className="mt-2 max-w-2xl leading-6">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button asChild className="font-black">
          <Link href={action.href}>
            {action.icon}
            {action.label}
          </Link>
        </Button>
        {secondaryAction ? (
          <Button asChild variant="outline" className="font-black">
            <Link href={secondaryAction.href}>
              {secondaryAction.icon}
              {secondaryAction.label}
            </Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function InsightPanel({
  label,
  value,
  detail,
  href,
  tone = 'neutral',
  icon,
}: {
  label: string
  value: string
  detail: string
  href?: string
  tone?: AccentTone
  icon?: React.ReactNode
}) {
  const toneStyle = toneClasses[tone]
  const content = (
    <Card
      className={cn(
        'relative overflow-hidden',
        toneStyle.panel,
        href && 'transition group-hover/panel:-translate-y-0.5 group-hover/panel:shadow-md',
      )}
    >
      <span className={cn('absolute inset-x-0 top-0 h-1', toneStyle.strip)} aria-hidden="true" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={cn('text-xs font-black uppercase', toneStyle.text)}>{label}</p>
          <strong className="mt-3 block text-xl font-black text-foreground">{value}</strong>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
        </div>
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', toneStyle.icon)}>
          {icon ?? <ArrowUpRight size={17} />}
        </span>
      </div>
    </Card>
  )

  return href ? (
    <Link href={href} className="group/panel block rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45">
      {content}
    </Link>
  ) : content
}
