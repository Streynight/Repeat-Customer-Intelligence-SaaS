'use server'

import { redirect } from 'next/navigation'
import { setActiveOrganizationId } from '@/lib/active-organization'
import { prisma } from '@/lib/prisma'
import { type MembershipRole } from '@/lib/rbac'
import { ensureAuthUserProfile } from '@/lib/server/auth-profile'
import { createClient } from '@/lib/supabase/server'
import { hashInvitationToken } from '@/lib/team-invitations'

export type TeamInvitationState = {
  status: 'invalid' | 'pending' | 'expired' | 'accepted'
  organizationName?: string
  email?: string
  role?: MembershipRole
  invitedByEmail?: string | null
  signedInEmail?: string | null
}

export async function loadTeamInvitation(token: string): Promise<TeamInvitationState> {
  const invitation = await findInvitationByToken(token)
  const signedInEmail = await getSignedInEmail()

  if (!invitation) {
    return { status: 'invalid', signedInEmail }
  }

  const base = {
    organizationName: invitation.organization.name,
    email: invitation.email,
    role: invitation.role,
    invitedByEmail: invitation.invitedBy?.email ?? null,
    signedInEmail,
  }

  if (invitation.acceptedAt) {
    return { ...base, status: 'accepted' }
  }

  if (invitation.expiresAt.getTime() < Date.now()) {
    return { ...base, status: 'expired' }
  }

  return { ...base, status: 'pending' }
}

export async function acceptTeamInvitation(token: string) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const authUser = data.user
  const email = authUser?.email?.trim().toLowerCase()

  if (!authUser || !email) {
    redirect(`/login?next=${encodeURIComponent(invitationPath(token))}`)
  }

  const invitation = await findInvitationByToken(token)

  if (!invitation) {
    throw new Error('Invitation not found.')
  }

  if (invitation.email !== email) {
    throw new Error(`This invitation was sent to ${invitation.email}. Sign in with that email to accept it.`)
  }

  if (invitation.acceptedAt) {
    await setActiveOrganizationId(invitation.organizationId)
    redirect('/dashboard')
  }

  if (invitation.expiresAt.getTime() < Date.now()) {
    throw new Error('This invitation has expired.')
  }

  await ensureAuthUserProfile(authUser.id, email)

  await prisma.$transaction(async (tx) => {
    const existingMembership = await tx.membership.findFirst({
      where: {
        organizationId: invitation.organizationId,
        userId: authUser.id,
      },
      select: { id: true },
    })

    if (!existingMembership) {
      await tx.membership.create({
        data: {
          organizationId: invitation.organizationId,
          userId: authUser.id,
          role: invitation.role,
          permissions: [],
        },
      })
    }

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    })

    await tx.auditLog.create({
      data: {
        organizationId: invitation.organizationId,
        actorUserId: authUser.id,
        action: 'invitation.accepted',
        resourceType: 'invitation',
        resourceId: invitation.id,
        metadata: {
          email,
          role: invitation.role,
        },
      },
    })
  })

  await setActiveOrganizationId(invitation.organizationId)
  redirect('/dashboard')
}

async function findInvitationByToken(token: string) {
  if (!token.trim()) return null

  return prisma.invitation.findUnique({
    where: { tokenHash: hashInvitationToken(token) },
    include: {
      invitedBy: true,
      organization: true,
    },
  })
}

async function getSignedInEmail() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  return data.user?.email?.trim().toLowerCase() ?? null
}

function invitationPath(token: string) {
  return `/team/invite/${encodeURIComponent(token)}`
}
