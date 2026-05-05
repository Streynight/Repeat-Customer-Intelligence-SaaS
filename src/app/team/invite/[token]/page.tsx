import Link from 'next/link'
import { acceptTeamInvitation, loadTeamInvitation } from '@/app/actions/team-invitations'
import { BrandLogo } from '@/components/brand-logo'
import { LanguageSwitcher } from '@/components/language-switcher'
import { LocalizedText } from '@/components/localized-text'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function TeamInvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const invitation = await loadTeamInvitation(token)
  const invitePath = `/team/invite/${encodeURIComponent(token)}`
  const authQuery = `?next=${encodeURIComponent(invitePath)}`

  async function acceptInvite() {
    'use server'
    await acceptTeamInvitation(token)
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-8">
      <Card className="w-full max-w-xl border-border">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <Link href="/" aria-label="RepeatTree home">
              <BrandLogo />
            </Link>
            <LanguageSwitcher />
          </div>
          <CardTitle className="mt-4 text-2xl font-semibold"><LocalizedText text="Team invitation" /></CardTitle>
          <CardDescription className="leading-6">
            <LocalizedText text="Join an existing RepeatTree workspace with the role assigned by your admin." />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {invitation.status === 'invalid' ? (
            <InviteAlert variant="destructive" text="This invitation link is invalid or has been revoked." />
          ) : (
            <div className="space-y-3 rounded-md border border-border p-3 text-sm">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground"><LocalizedText text="Workspace" /></p>
                <p className="font-semibold">{invitation.organizationName}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{invitation.role}</Badge>
                <Badge variant={invitation.status === 'pending' ? 'secondary' : 'outline'}>{invitation.status}</Badge>
              </div>
              <p className="text-muted-foreground">
                <LocalizedText text="Invited email" />: <span className="font-medium text-foreground">{invitation.email}</span>
              </p>
            </div>
          )}

          {invitation.status === 'expired' ? (
            <InviteAlert variant="destructive" text="This invitation has expired. Ask an admin to send a new invite." />
          ) : null}

          {invitation.status === 'accepted' ? (
            <div className="grid gap-3">
              <InviteAlert text="This invitation has already been accepted." />
              <Button asChild>
                <Link href="/dashboard"><LocalizedText text="Open workspace" /></Link>
              </Button>
            </div>
          ) : null}

          {invitation.status === 'pending' && !invitation.signedInEmail ? (
            <div className="grid gap-3">
              <InviteAlert text="Sign in or create an account with the invited email to accept this invite." />
              <div className="grid gap-2 sm:grid-cols-2">
                <Button asChild>
                  <Link href={`/login${authQuery}`}><LocalizedText text="Sign in" /></Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/signup${authQuery}`}><LocalizedText text="Create account" /></Link>
                </Button>
              </div>
            </div>
          ) : null}

          {invitation.status === 'pending' && invitation.signedInEmail && invitation.signedInEmail !== invitation.email ? (
            <InviteAlert
              variant="destructive"
              text={`This invitation was sent to ${invitation.email}. Sign in with that email to accept it.`}
            />
          ) : null}

          {invitation.status === 'pending' && invitation.signedInEmail === invitation.email ? (
            <form action={acceptInvite}>
              <Button className="w-full" type="submit"><LocalizedText text="Accept invitation" /></Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}

function InviteAlert({
  text,
  variant,
}: {
  text: string
  variant?: 'default' | 'destructive'
}) {
  return (
    <Alert variant={variant}>
      <AlertDescription><LocalizedText text={text} /></AlertDescription>
    </Alert>
  )
}
