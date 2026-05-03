import { Suspense } from 'react'
import { CustomersClient } from '@/components/customers/customers-client'
import { AppShell, PageHeader } from '@/components/ui/app-shell'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function CustomersPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Unified profiles"
        title="Customers"
        description="Merged customer identities across channels with repeat, VIP, at-risk, and lost classifications."
      />
      <Suspense fallback={<CustomersFallback />}>
        <CustomersClient />
      </Suspense>
    </AppShell>
  )
}

function CustomersFallback() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loading customer explorer</CardTitle>
        <CardDescription>Preparing filters and unified customer profiles.</CardDescription>
      </CardHeader>
    </Card>
  )
}
