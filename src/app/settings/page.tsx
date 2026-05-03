import { SettingsClient } from '@/components/settings-client'
import { AppShell, PageHeader } from '@/components/ui/app-shell'

export default function SettingsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="MVP settings for customer classification thresholds and future webhook automation."
      />
      <SettingsClient />
    </AppShell>
  )
}
