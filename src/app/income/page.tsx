import { Suspense } from 'react'
import { IncomeClient } from '@/components/income/income-client'
import { AppShell, PageHeader } from '@/components/ui/app-shell'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function IncomePage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Income and VAT"
        title="Income"
        description="Track gross income, net snapshot, Thailand VAT estimates, channel income, and scheduled CSV order syncs."
      />
      <Suspense fallback={<IncomeFallback />}>
        <IncomeClient />
      </Suspense>
    </AppShell>
  )
}

function IncomeFallback() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loading income workspace</CardTitle>
        <CardDescription>Preparing revenue, VAT, and sync tools.</CardDescription>
      </CardHeader>
    </Card>
  )
}
