import { DashboardClient } from '@/components/dashboard/dashboard-client'
import { AppShell, PageHeader } from '@/components/ui/app-shell'

export default function DashboardPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Main value screen"
        title="Repeat customer dashboard"
        description="Understand who buys repeatedly, who is VIP or at risk, and which channel drives repeat revenue in under ten seconds."
      />
      <DashboardClient />
    </AppShell>
  )
}
