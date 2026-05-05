import { redirect } from 'next/navigation'
import { loadBillingOverview } from '@/app/actions/billing'
import { SettingsClient } from '@/components/settings-client'
import { AppShell, PageHeader } from '@/components/ui/app-shell'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  let billing: Awaited<ReturnType<typeof loadBillingOverview>>

  try {
    billing = await loadBillingOverview()
  } catch (error) {
    if (error instanceof Error && error.message === 'Not authenticated') {
      redirect('/login')
    }

    throw error
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Workspace status, classification controls, and safe production data operations."
      />
      <SettingsClient billing={billing} />
    </AppShell>
  )
}
