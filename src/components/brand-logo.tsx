import { cn } from '@/lib/utils'

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
    <span className={cn('inline-flex items-center gap-2 font-black tracking-tight text-foreground', className)}>
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-lg border border-primary/15 bg-primary/10 text-primary',
          markClassName,
        )}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 40 40"
          className="size-7"
          role="img"
        >
          <path
            d="M18.4 20.5h3.2l1.3 12.3h-5.8l1.3-12.3Z"
            fill="var(--primary)"
          />
          <path
            d="M11.4 18.9c-3.1-.5-5.4-3.1-5.4-6.3 0-3.6 2.9-6.5 6.5-6.5.9 0 1.8.2 2.6.6A7.8 7.8 0 0 1 20.9 4c3.7 0 6.8 2.5 7.6 5.9a6.2 6.2 0 0 1 5.5 6.1c0 3.4-2.8 6.2-6.2 6.2H13.4c-3 0-5.4-2.4-5.4-5.4 0-.8.2-1.5.5-2.2 1 2.2 2.1 3.4 2.9 4.3Z"
            fill="var(--accent)"
          />
          <path
            d="M12.8 17.1c2.5-4.4 6.5-6.6 12-6.4 2.2.1 4 .6 5.5 1.5-1.2-2.7-3.6-4.4-6.4-4.4-2.9 0-5.3 1.7-6.5 4.1a5.8 5.8 0 0 0-4.6-2.2 5.2 5.2 0 0 0-5.2 5.2c0 1.8.9 3.4 2.2 4.3.6-.8 1.6-1.5 3-2.1Z"
            fill="var(--card)"
            opacity="0.5"
          />
          <path
            d="M15.6 32.8h8.8"
            fill="none"
            stroke="var(--primary)"
            strokeLinecap="round"
            strokeWidth="2"
          />
          <circle cx="17.2" cy="15.8" r="1" fill="var(--foreground)" opacity="0.75" />
          <circle cx="23" cy="15.8" r="1" fill="var(--foreground)" opacity="0.75" />
          <path d="M17.7 18.7c1.5 1.3 3.4 1.3 4.9 0" fill="none" stroke="var(--foreground)" strokeLinecap="round" strokeWidth="1.4" opacity="0.75" />
        </svg>
      </span>
      {showText ? <span className={cn('text-lg', textClassName)}>RepeatTree</span> : null}
    </span>
  )
}
