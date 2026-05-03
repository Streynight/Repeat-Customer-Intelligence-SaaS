import { CustomerDetailClient } from '@/components/customers/customers-client'
import { AppShell, PageHeader } from '@/components/ui/app-shell'

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <AppShell>
      <PageHeader
        eyebrow="Customer detail"
        title="Customer profile"
        description="Full identity, merged channels, purchase history, products bought, and order timeline."
      />
      <CustomerDetailClient id={id} />
    </AppShell>
  )
}
