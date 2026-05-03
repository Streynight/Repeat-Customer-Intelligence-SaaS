import { ImportClient } from '@/components/imports/import-client'
import { AppShell, PageHeader } from '@/components/ui/app-shell'

export default function ImportsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="CSV import"
        title="Import multi-channel orders"
        description="Upload marketplace and social commerce order exports, map columns, preview rows, and process customers through the identity engine."
      />
      <ImportClient />
    </AppShell>
  )
}
