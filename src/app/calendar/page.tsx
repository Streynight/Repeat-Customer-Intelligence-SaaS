import { CalendarClient } from '@/components/calendar/calendar-client'
import { AppShell, PageHeader } from '@/components/ui/app-shell'

export default function CalendarPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Repeat timing"
        title="Calendar"
        description="See repeat orders, revenue, channel activity, and follow-up timing by day without adding manual event work."
      />
      <CalendarClient />
    </AppShell>
  )
}
