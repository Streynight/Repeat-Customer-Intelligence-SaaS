import { SettingsClient } from '@/components/settings-client'
import { AppShell, PageHeader } from '@/components/ui/app-shell'

export default function SettingsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Workspace status, classification controls, and safe production data operations."
      />
      <SettingsClient />
    </AppShell>
  )
}
