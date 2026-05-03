import { SettingsClient } from '@/components/settings-client'
import { AppShell, PageHeader } from '@/components/ui/app-shell'

export default function SettingsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Production settings for customer classification, tenant operations, and lifecycle automation."
      />
      <SettingsClient />
    </AppShell>
  )
}
