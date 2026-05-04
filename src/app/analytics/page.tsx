import { Suspense } from 'react'
import { AnalyticsClient } from '@/components/analytics/analytics-client'
import { LocalizedText } from '@/components/localized-text'
import { AppShell, PageHeader } from '@/components/ui/app-shell'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AnalyticsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Deep retention analytics"
        title="Analytics"
        description="Cohorts, RFM segments, product repeat paths, channel quality, and opportunity lists built from order data."
      />
      <Suspense fallback={<AnalyticsFallback />}>
        <AnalyticsClient />
      </Suspense>
    </AppShell>
  )
}

function AnalyticsFallback() {
  return (
    <Card>
      <CardHeader>
        <CardTitle><LocalizedText text="Loading analytics" /></CardTitle>
        <CardDescription><LocalizedText text="Preparing retention cohorts and customer opportunities." /></CardDescription>
      </CardHeader>
    </Card>
  )
}
