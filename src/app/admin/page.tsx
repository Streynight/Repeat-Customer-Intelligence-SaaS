import { redirect } from 'next/navigation'
import { loadAdminDiagnostics } from '@/app/actions/admin'
import { AppShell, PageHeader } from '@/components/ui/app-shell'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LocalizedText } from '@/components/localized-text'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  let diagnostics: Awaited<ReturnType<typeof loadAdminDiagnostics>>

  try {
    diagnostics = await loadAdminDiagnostics()
  } catch (error) {
    if (error instanceof Error && error.message === 'Not authenticated') {
      redirect('/login')
    }

    throw error
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Operations"
        title="Admin diagnostics"
        description="Read-only operating view for tenant health, billing state, ingestion failures, and audit activity."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle><LocalizedText text="Organization" /></CardTitle>
            <CardDescription><LocalizedText text="Tenant and subscription state." /></CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="font-semibold">{diagnostics.organization?.name ?? <LocalizedText text="No organization" />}</p>
            <div className="flex gap-2">
              <Badge variant="secondary">{diagnostics.organization?.plan ?? 'starter'}</Badge>
              <Badge variant="outline">{diagnostics.organization?.billingStatus ?? 'trialing'}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle><LocalizedText text="Team" /></CardTitle>
            <CardDescription><LocalizedText text="Current organization members." /></CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {diagnostics.organization?.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-3">
                <span className="truncate">{member.email}</span>
                <Badge variant="outline">{member.role}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle><LocalizedText text="Ingestion" /></CardTitle>
            <CardDescription><LocalizedText text="Recent failed jobs." /></CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {diagnostics.ingestionFailures.length === 0 ? (
              <p className="text-muted-foreground"><LocalizedText text="No failed ingestion jobs." /></p>
            ) : diagnostics.ingestionFailures.map((job) => (
              <div key={job.id} className="rounded-md border border-border p-2">
                <p className="font-semibold">{job.provider} / {job.jobType}</p>
                <p className="text-muted-foreground">{job.errorMessage}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
