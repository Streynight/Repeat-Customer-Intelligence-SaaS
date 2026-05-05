import { ImportClient } from '@/components/imports/import-client'
import { AppShell, PageHeader } from '@/components/ui/app-shell'

export default function ImportsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Marketplace import"
        title="Import multi-channel orders"
        description="Upload order files from Shopee, TikTok, Lazada, or CSV. RepeatTree cleans and maps the export before analysis."
      />
      <ImportClient />
    </AppShell>
  )
}
