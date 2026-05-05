import { redirect } from 'next/navigation'
import { loadAdminDiagnostics, updateMemberRole } from '@/app/actions/admin'
import { AppShell, PageHeader } from '@/components/ui/app-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LocalizedText } from '@/components/localized-text'
import { adminAssignableRoles, ownerAssignableRoles, type MembershipRole } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

const roleLabels: Record<MembershipRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  analyst: 'Analyst',
  billing: 'Billing',
  viewer: 'Viewer',
}

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

  const roleOptions = diagnostics.currentUserRole === 'owner' ? ownerAssignableRoles : adminAssignableRoles

  return (
    <AppShell>
      <PageHeader
        eyebrow="Operations"
        title="Admin diagnostics"
        description="Operational control for tenant health, team roles, ingestion failures, and audit activity."
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
            <CardDescription><LocalizedText text="Manage organization members." /></CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {diagnostics.organization?.members.map((member) => (
              <div key={member.id} className="flex flex-col gap-2 rounded-md border border-border p-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="truncate">{member.email}</span>
                {canEditMemberRole(diagnostics.currentUserRole, member.role) ? (
                  <form action={updateMemberRole} className="flex items-center gap-2">
                    <input type="hidden" name="membershipId" value={member.id} />
                    <select
                      name="role"
                      defaultValue={member.role}
                      className="h-8 rounded-md border border-input bg-card px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>{roleLabels[role]}</option>
                      ))}
                    </select>
                    <Button type="submit" size="sm" variant="outline"><LocalizedText text="Save" /></Button>
                  </form>
                ) : (
                  <Badge variant="outline">{roleLabels[member.role]}</Badge>
                )}
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

function canEditMemberRole(currentUserRole: MembershipRole, memberRole: MembershipRole) {
  return currentUserRole === 'owner' || memberRole !== 'owner'
}
