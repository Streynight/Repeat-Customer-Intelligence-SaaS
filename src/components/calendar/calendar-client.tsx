'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Repeat2, ShoppingBag, UploadCloud } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, MetricCard } from '@/components/ui/card'
import { TreeEmptyState } from '@/components/ui/tree-surfaces'
import { buildCalendarMonth, getDefaultCalendarMonth, type CalendarDayInsight } from '@/lib/services/calendar'
import { buildCustomersHref } from '@/lib/services/customer-filters'
import { useIntelligenceDataset } from '@/lib/use-intelligence-dataset'
import { channelLabels } from '@/lib/types'
import { cn, dateLabel, money } from '@/lib/utils'

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function CalendarClient() {
  const { dataset, loading } = useIntelligenceDataset()
  const defaultMonth = useMemo(() => getDefaultCalendarMonth(dataset), [dataset])
  const [monthOverride, setMonthOverride] = useState<string | null>(null)
  const month = monthOverride ?? defaultMonth
  const calendar = useMemo(() => buildCalendarMonth(dataset, month), [dataset, month])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const setActiveMonth = (nextMonth: string | null) => {
    setMonthOverride(nextMonth)
    setSelectedDate(null)
  }
  const firstFocusDate = useMemo(() => {
    const actionableDay = calendar.days.find(
      (day) => day.isCurrentMonth && (day.orderCount > 0 || day.reminders.length > 0),
    )

    return actionableDay?.date ?? `${month}-01`
  }, [calendar.days, month])
  const selectedDay = calendar.days.find((day) => day.date === selectedDate) ??
    calendar.days.find((day) => day.date === firstFocusDate) ??
    calendar.days[0]
  const monthRepeatRevenue = calendar.days.reduce((sum, day) => {
    return day.isCurrentMonth ? sum + day.repeatRevenue : sum
  }, 0)
  const monthOrders = calendar.days.reduce((sum, day) => {
    return day.isCurrentMonth ? sum + day.orderCount : sum
  }, 0)
  const monthReminders = calendar.days.reduce((sum, day) => {
    return day.isCurrentMonth ? sum + day.reminders.length : sum
  }, 0)
  const workspaceEmpty = dataset.customers.length === 0 && dataset.orders.length === 0

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading calendar</CardTitle>
          <CardDescription>Checking your order history and follow-up timing.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Orders this month" value={monthOrders.toLocaleString()} href={buildCustomersHref()} />
        <MetricCard label="Repeat revenue" value={money(monthRepeatRevenue)} tone="repeat" href={buildCustomersHref({ segment: 'repeat', sort: 'repeatRevenue' })} />
        <MetricCard label="Follow-up focus" value={monthReminders.toLocaleString()} tone="risk" href={buildCustomersHref({ segment: 'winback', sort: 'lastOrder' })} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-black">
                <CalendarDays className="size-5 text-primary" />
                {formatMonthLabel(month)}
              </CardTitle>
              <CardDescription>Daily repeat orders, revenue, channels, and win-back timing.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex h-9 items-center gap-2 rounded-lg border border-input bg-card px-2 text-xs font-black uppercase text-muted-foreground">
                <span>Month</span>
                <input
                  type="month"
                  aria-label="Month"
                  value={month}
                  onChange={(event) => {
                    if (event.target.value) setActiveMonth(event.target.value)
                  }}
                  className="h-7 min-w-32 rounded-md border border-border bg-background px-2 text-sm font-semibold normal-case text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
                />
              </label>
              <Button
                variant="outline"
                size="icon"
                aria-label="Previous month"
                onClick={() => {
                  setActiveMonth(shiftMonth(month, -1))
                }}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveMonth(null)
                }}
              >
                Latest
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Next month"
                onClick={() => {
                  setActiveMonth(shiftMonth(month, 1))
                }}
              >
                <ChevronRight />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 border-y border-border bg-muted/45 text-center text-xs font-black uppercase text-muted-foreground">
              {weekdays.map((weekday) => (
                <div key={weekday} className="px-2 py-2">{weekday}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 border-l border-border">
              {calendar.days.map((day) => (
                <CalendarDayButton
                  key={day.date}
                  day={day}
                  selected={day.date === selectedDay.date}
                  onSelect={() => setSelectedDate(day.date)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <DayDetailPanel day={selectedDay} empty={workspaceEmpty} />
      </div>
    </div>
  )
}

function CalendarDayButton({
  day,
  selected,
  onSelect,
}: {
  day: CalendarDayInsight
  selected: boolean
  onSelect: () => void
}) {
  const repeatPreview = day.repeatCustomers.slice(0, 2)
  const hiddenRepeatCustomers = day.repeatCustomers.length - repeatPreview.length

  return (
    <button
      type="button"
      aria-label={`${dateLabel(day.date)} calendar day`}
      onClick={onSelect}
      className={cn(
        'min-h-32 border-b border-r border-border bg-card p-2 text-left transition hover:bg-accent/45 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45',
        day.repeatCustomers.length > 0 && 'border-emerald-200/80 bg-emerald-50/45',
        day.reminders.length > 0 && day.repeatCustomers.length === 0 && 'border-amber-200/80 bg-amber-50/45',
        !day.isCurrentMonth && 'bg-muted/25 text-muted-foreground',
        selected && 'bg-primary/10 ring-2 ring-primary/35',
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-sm font-black">{day.dayOfMonth}</span>
        {day.topChannel ? (
          <span className="truncate rounded-md bg-secondary px-1.5 py-0.5 text-[0.65rem] font-bold text-secondary-foreground">
            {channelLabels[day.topChannel]}
          </span>
        ) : null}
      </div>
      <div className="mt-3 grid gap-1 text-[0.72rem] leading-4 text-muted-foreground">
        {day.orderCount > 0 ? <span>{day.orderCount} orders</span> : <span className="opacity-60">No orders</span>}
        {day.repeatOrderCount > 0 ? <span className="font-bold text-emerald-800">{day.repeatOrderCount} repeat</span> : null}
        {day.repeatRevenue > 0 ? <span>{money(day.repeatRevenue)}</span> : null}
        {day.reminders.length > 0 ? <span className="font-bold text-amber-700">{day.reminders.length} follow-up</span> : null}
      </div>
      {repeatPreview.length > 0 ? (
        <div className="mt-2 grid gap-1">
          {repeatPreview.map((customer) => (
            <span
              key={customer.customerId}
              className="truncate rounded-md bg-emerald-100/80 px-1.5 py-0.5 text-[0.68rem] font-bold text-emerald-900"
            >
              {customer.customerName}
            </span>
          ))}
          {hiddenRepeatCustomers > 0 ? (
            <span className="text-[0.68rem] font-semibold text-emerald-800">+{hiddenRepeatCustomers} more</span>
          ) : null}
        </div>
      ) : null}
    </button>
  )
}

function DayDetailPanel({ day, empty }: { day: CalendarDayInsight; empty: boolean }) {
  const winBackReminders = day.reminders.filter((reminder) => reminder.priority === 'win-back')

  if (empty) {
    return (
      <div className="xl:sticky xl:top-6 xl:self-start">
        <TreeEmptyState
          title="No calendar activity yet"
          description="Import your first order CSV to fill this calendar with repeat buyers, revenue days, channel activity, and follow-up reminders."
          tone="risk"
          action={{ href: '/imports', label: 'Import orders', icon: <UploadCloud size={16} /> }}
        />
      </div>
    )
  }

  return (
    <Card className="xl:sticky xl:top-6 xl:self-start">
      <CardHeader>
        <CardTitle className="text-lg font-black">{dateLabel(day.date)}</CardTitle>
        <CardDescription>
          {day.orderCount} orders, {day.repeatOrderCount} repeat orders, {money(day.repeatRevenue)} repeat revenue
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-black">Channel breakdown</h3>
            <Badge variant={day.channelBreakdown.length ? 'secondary' : 'outline'}>
              {day.channelBreakdown.length || 'None'}
            </Badge>
          </div>
          <div className="grid gap-2">
            {day.channelBreakdown.length > 0 ? (
              day.channelBreakdown.map((row) => (
                <Link
                  key={row.channel}
                  href={buildCustomersHref({ repeatChannel: row.channel, sort: 'repeatRevenue' })}
                  className="block rounded-lg border border-border bg-secondary/25 p-3 transition hover:bg-secondary/55 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold">{channelLabels[row.channel]}</span>
                    <span className="text-sm text-muted-foreground">{money(row.repeatRevenue)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.orders} orders, {row.repeatOrders} repeat, {money(row.revenue)} total
                  </p>
                </Link>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                No channel activity for this day.
              </p>
            )}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <Repeat2 className="size-4 text-emerald-700" />
            <h3 className="text-sm font-black">Repeat buyers</h3>
          </div>
          <div className="grid gap-2">
            {day.repeatCustomers.length > 0 ? (
              day.repeatCustomers.map((customer) => (
                <Link
                  key={customer.customerId}
                  href={`/customers/${customer.customerId}`}
                  className="block rounded-lg border border-emerald-200/80 bg-emerald-50/65 p-3 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-emerald-950">{customer.customerName}</p>
                      <p className="text-xs text-emerald-800">
                        {customer.repeatOrders} repeat {customer.repeatOrders === 1 ? 'order' : 'orders'} via {formatChannels(customer.sourceChannels)}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-100 text-emerald-900">
                      {money(customer.repeatRevenue)}
                    </Badge>
                  </div>
                </Link>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                No repeat buyers on this date.
              </p>
            )}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <ShoppingBag className="size-4 text-primary" />
            <h3 className="text-sm font-black">Orders</h3>
          </div>
          <div className="grid gap-2">
            {day.orders.length > 0 ? (
              day.orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/customers/${order.customerProfileId}`}
                  className="block rounded-lg border border-border bg-card p-3 transition hover:bg-secondary/35 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">{order.customerName}</p>
                      <p className="text-xs text-muted-foreground">{channelLabels[order.sourceChannel]}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black">{money(order.totalAmount)}</p>
                      {order.isRepeatOrder ? (
                        <Badge variant="outline" className="border-emerald-300 bg-emerald-100 text-emerald-900">
                          Repeat
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                No orders on this date.
              </p>
            )}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <Clock3 className="size-4 text-primary" />
            <h3 className="text-sm font-black">Follow-up focus</h3>
          </div>
          {winBackReminders.length > 0 ? (
            <p className="mb-2 rounded-lg bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900">
              {winBackReminders.length} at-risk or lost customers are due for attention.
            </p>
          ) : null}
          <div className="grid gap-2">
            {day.reminders.length > 0 ? (
              day.reminders.map((reminder) => (
                <Link
                  key={reminder.customerId}
                  href={`/customers/${reminder.customerId}`}
                  className="block rounded-lg border border-border bg-secondary/25 p-3 transition hover:bg-secondary/55 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">{reminder.customerName}</p>
                      <p className="text-xs text-muted-foreground">
                        Last bought {dateLabel(reminder.lastOrderDate)}
                      </p>
                    </div>
                    <Badge variant={reminder.priority === 'win-back' ? 'destructive' : 'outline'}>
                      {reminder.customerStatus}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {reminder.totalOrders} orders, {money(reminder.totalSpent)} lifetime value
                  </p>
                </Link>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                No follow-up reminders due.
              </p>
            )}
          </div>
        </section>
      </CardContent>
    </Card>
  )
}

function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1))

  return date.toISOString().slice(0, 7)
}

function formatMonthLabel(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)))
}

function formatChannels(channels: Array<keyof typeof channelLabels>) {
  return channels.map((channel) => channelLabels[channel]).join(', ')
}
