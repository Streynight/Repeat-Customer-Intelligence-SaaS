import * as React from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-4 overflow-hidden rounded-xl border border-border/80 bg-card/95 p-5 text-sm text-card-foreground shadow-sm shadow-stone-200/70 ring-1 ring-foreground/5 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:p-4 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl group-data-[size=sm]/card:px-0 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("group-data-[size=sm]/card:px-0", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t bg-muted/50 p-4 group-data-[size=sm]/card:p-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  MetricCard,
}

function MetricCard({
  label,
  value,
  detail,
  tone = "neutral",
  href,
}: {
  label: string
  value: string
  detail?: string
  tone?: "neutral" | "repeat" | "vip" | "risk"
  href?: string
}) {
  const toneClass = {
    neutral: "",
    repeat: "border-emerald-200/80 bg-emerald-50/70 shadow-emerald-100/40",
    vip: "border-yellow-200/80 bg-yellow-50/75 shadow-yellow-100/40",
    risk: "border-amber-200/80 bg-amber-50/75 shadow-amber-100/40",
  }[tone]
  const labelClass = {
    neutral: "text-muted-foreground",
    repeat: "text-emerald-800",
    vip: "text-yellow-800",
    risk: "text-amber-800",
  }[tone]

  const content = (
    <Card
      size="sm"
      className={cn(
        toneClass,
        href && "transition group-hover/metric:-translate-y-0.5 group-hover/metric:shadow-md group-hover/metric:shadow-stone-200/60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`text-[0.7rem] font-black uppercase ${labelClass}`}>{label}</p>
          <strong className="block text-2xl font-black tracking-tight text-foreground">{value}</strong>
        </div>
        {href ? <ArrowUpRight className="size-4 text-muted-foreground group-hover/metric:text-primary" /> : null}
      </div>
      {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
    </Card>
  )

  return href ? (
    <Link href={href} className="group/metric block rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45">
      {content}
    </Link>
  ) : (
    content
  )
}
