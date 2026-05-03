import { cn } from '@/lib/utils'
import { Repeat2 } from 'lucide-react'

export function BrandLogo({
  className,
  markClassName,
  textClassName,
  showText = true,
}: {
  className?: string
  markClassName?: string
  textClassName?: string
  showText?: boolean
}) {
  return (
    <span className={cn('group/logo inline-flex items-center gap-2 font-black tracking-tight text-foreground', className)}>
      <span
        className={cn(
          'relative grid size-9 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary text-primary-foreground shadow-sm transition group-hover/logo:border-primary/40 group-hover/logo:bg-primary/90',
          markClassName,
        )}
        aria-hidden="true"
      >
        <span className="absolute -right-1 -top-1 size-3 rounded-full border border-background bg-accent shadow-sm" />
        <Repeat2 className="size-5" strokeWidth={2.5} />
      </span>
      {showText ? <span className={cn('text-lg', textClassName)}>RepeatTree</span> : null}
    </span>
  )
}
