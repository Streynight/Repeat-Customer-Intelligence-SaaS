'use client'

import { useState } from 'react'
import { createTeamInvitation, removeTeamMember, revokeTeamInvitation, updateMemberRole } from '@/app/actions/admin'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { adminAssignableRoles, ownerAssignableRoles, type MembershipRole } from '@/lib/rbac'
import { useText } from '@/lib/i18n'

type TeamMember = {
  id: string
  userId: string
  email: string
  role: MembershipRole
}

type TeamInvitation = {
  id: string
  email: string
  role: MembershipRole
  invitedByEmail: string | null
  expiresAt: string
  status: 'pending' | 'expired'
}

const roleLabels: Record<MembershipRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  analyst: 'Analyst',
  billing: 'Billing',
  viewer: 'Viewer',
}

export function TeamManagement({
  currentUserId,
  currentUserRole,
  members,
  invitations,
}: {
  currentUserId: string
  currentUserRole: MembershipRole
  members: TeamMember[]
  invitations: TeamInvitation[]
}) {
  const t = useText()
  const roleOptions = currentUserRole === 'owner' ? ownerAssignableRoles : adminAssignableRoles
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<MembershipRole>('editor')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const inviteTeammate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!inviteEmail.trim()) return

    setInviting(true)
    setMessage('')
    setError('')

    const result = await createTeamInvitation({ email: inviteEmail, role: inviteRole })

    setInviting(false)
    if (!result.ok) {
      setError(result.error ?? t('Invitation failed.'))
      return
    }

    setInviteEmail('')
    setInviteRole('editor')
    setMessage(result.message ?? t('Invitation sent.'))
  }

  const saveRole = async (membershipId: string, role: MembershipRole) => {
    setSavingId(membershipId)
    setMessage('')
    setError('')

    try {
      const formData = new FormData()
      formData.set('membershipId', membershipId)
      formData.set('role', role)
      await updateMemberRole(formData)
      setMessage(t('Team role updated.'))
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : t('Team role update failed.'))
    } finally {
      setSavingId(null)
    }
  }

  const revokeInvitation = async (invitationId: string) => {
    setSavingId(invitationId)
    setMessage('')
    setError('')

    const result = await revokeTeamInvitation(invitationId)

    setSavingId(null)
    if (!result.ok) {
      setError(result.error ?? t('Invitation revoke failed.'))
      return
    }

    setMessage(result.message ?? t('Invitation revoked.'))
  }

  const removeMember = async (membershipId: string) => {
    setSavingId(membershipId)
    setMessage('')
    setError('')

    const result = await removeTeamMember(membershipId)

    setSavingId(null)
    if (!result.ok) {
      setError(result.error ?? t('Teammate remove failed.'))
      return
    }

    setMessage(result.message ?? t('Teammate removed.'))
  }

  return (
    <div className="space-y-4">
      <form className="grid gap-3 rounded-md border border-border p-3" onSubmit={(event) => void inviteTeammate(event)}>
        <div className="grid gap-2">
          <Label htmlFor="invite-email">{t('Invite teammate')}</Label>
          <Input
            id="invite-email"
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="teammate@store.com"
            autoComplete="email"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            aria-label={t('Invitation role')}
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value as MembershipRole)}
            className="h-8 rounded-md border border-input bg-card px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>{t(roleLabels[role])}</option>
            ))}
          </select>
          <Button disabled={inviting || !inviteEmail.trim()} type="submit" size="sm">
            {inviting ? t('Sending...') : t('Send invite')}
          </Button>
        </div>
      </form>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {message ? (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        {members.map((member) => (
          <div key={member.id} className="flex flex-col gap-2 rounded-md border border-border p-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="truncate">{member.email}</span>
            {canEditMemberRole(currentUserId, currentUserRole, member) ? (
              <MemberRoleForm
                member={member}
                roleOptions={roleOptions}
                saving={savingId === member.id}
                onSave={(role) => void saveRole(member.id, role)}
                onRemove={() => void removeMember(member.id)}
              />
            ) : (
              <Badge variant="outline">{t(roleLabels[member.role])}</Badge>
            )}
          </div>
        ))}
      </div>

      {invitations.length > 0 ? (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-bold uppercase text-muted-foreground">{t('Pending invitations')}</p>
          {invitations.map((invitation) => (
            <div key={invitation.id} className="flex flex-col gap-2 rounded-md border border-border p-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-medium">{invitation.email}</p>
                <p className="text-xs text-muted-foreground">
                  {t(roleLabels[invitation.role])} - {t(invitation.status === 'expired' ? 'Expired' : 'Expires')} {formatDate(invitation.expiresAt)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={savingId === invitation.id}
                onClick={() => void revokeInvitation(invitation.id)}
              >
                {savingId === invitation.id ? t('Saving...') : t('Revoke')}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function MemberRoleForm({
  member,
  roleOptions,
  saving,
  onSave,
  onRemove,
}: {
  member: TeamMember
  roleOptions: readonly MembershipRole[]
  saving: boolean
  onSave: (role: MembershipRole) => void
  onRemove: () => void
}) {
  const t = useText()
  const [role, setRole] = useState<MembershipRole>(member.role)

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label={t('Member role')}
        value={role}
        onChange={(event) => setRole(event.target.value as MembershipRole)}
        className="h-8 rounded-md border border-input bg-card px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        {roleOptions.map((roleOption) => (
          <option key={roleOption} value={roleOption}>{t(roleLabels[roleOption])}</option>
        ))}
      </select>
      <Button type="button" size="sm" variant="outline" disabled={saving || role === member.role} onClick={() => onSave(role)}>
        {saving ? t('Saving...') : t('Save')}
      </Button>
      <Button type="button" size="sm" variant="destructive" disabled={saving} onClick={onRemove}>
        {t('Remove')}
      </Button>
    </div>
  )
}

function canEditMemberRole(currentUserId: string, currentUserRole: MembershipRole, member: TeamMember) {
  if (member.userId === currentUserId) return false
  return currentUserRole === 'owner' || member.role !== 'owner'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value))
}
