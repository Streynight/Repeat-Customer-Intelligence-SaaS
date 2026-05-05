'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { isMembershipRole, type MembershipRole } from '@/lib/rbac'
import {
  createInvitationToken,
  invitationExpiryDate,
  invitationUrl,
  sendTeamInvitationEmail,
} from '@/lib/team-invitations'
import { requireTenantContext, writeAuditLog } from '@/lib/tenancy'

export type TeamActionResult = {
  ok: boolean
  message?: string
  error?: string
}

export async function loadAdminDiagnostics() {
  const context = await requireTenantContext({ permission: 'viewAdmin' })
  const [organization, ingestionFailures, recentAuditLogs] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: context.organizationId },
      include: {
        billingSubscription: true,
        invitations: {
          where: { acceptedAt: null },
          include: { invitedBy: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        memberships: { include: { user: true } },
        workspaces: { include: { integrationConnections: true } },
      },
    }),
    prisma.ingestionJob.findMany({
      where: { workspaceId: context.workspaceId, status: 'failed' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.auditLog.findMany({
      where: { organizationId: context.organizationId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  return {
    currentUserId: context.userId,
    currentUserRole: context.role,
    organization: organization ? {
      id: organization.id,
      name: organization.name,
      plan: organization.billingSubscription?.plan ?? 'starter',
      billingStatus: organization.billingSubscription?.status ?? 'trialing',
      members: organization.memberships.map((membership) => ({
        id: membership.id,
        userId: membership.userId,
        email: membership.user.email,
        role: membership.role,
      })),
      invitations: organization.invitations.map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        invitedByEmail: invitation.invitedBy?.email ?? null,
        expiresAt: invitation.expiresAt.toISOString(),
        status: invitation.expiresAt.getTime() < Date.now() ? 'expired' as const : 'pending' as const,
      })),
      workspaces: organization.workspaces.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        integrations: workspace.integrationConnections.length,
      })),
    } : null,
    ingestionFailures: ingestionFailures.map((job) => ({
      id: job.id,
      provider: job.provider,
      jobType: job.jobType,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt.toISOString(),
    })),
    recentAuditLogs: recentAuditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      createdAt: log.createdAt.toISOString(),
    })),
  }
}

export async function createTeamInvitation(input: { email: string; role: MembershipRole }): Promise<TeamActionResult> {
  let savedInvitationId: string | null = null

  try {
    const context = await requireTenantContext({ permission: 'manageMembers' })
    const email = input.email.trim().toLowerCase()

    if (!email || !email.includes('@')) {
      throw new Error('Enter a valid teammate email.')
    }

    if (!isMembershipRole(input.role)) {
      throw new Error('Membership role is invalid.')
    }

    if (input.role === 'owner' && context.role !== 'owner') {
      throw new Error('Only owners can invite another owner.')
    }

    const organization = await prisma.organization.findUnique({
      where: { id: context.organizationId },
      select: { id: true, name: true },
    })

    if (!organization) {
      throw new Error('Organization not found.')
    }

    const existingMember = await prisma.membership.findFirst({
      where: {
        organizationId: context.organizationId,
        user: { email },
      },
      select: { id: true },
    })

    if (existingMember) {
      throw new Error('This email is already a teammate.')
    }

    const { token, tokenHash } = createInvitationToken()
    const expiresAt = invitationExpiryDate()
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        organizationId: context.organizationId,
        email,
        acceptedAt: null,
      },
      select: { id: true },
    })

    const invitation = existingInvitation
      ? await prisma.invitation.update({
        where: { id: existingInvitation.id },
        data: {
          role: input.role,
          tokenHash,
          invitedByUserId: context.userId,
          expiresAt,
        },
      })
      : await prisma.invitation.create({
        data: {
          organizationId: context.organizationId,
          email,
          role: input.role,
          tokenHash,
          invitedByUserId: context.userId,
          expiresAt,
        },
      })

    savedInvitationId = invitation.id

    await writeAuditLog(context, {
      action: 'invitation.created',
      resourceType: 'invitation',
      resourceId: invitation.id,
      metadata: {
        email,
        role: input.role,
      },
    })

    await sendTeamInvitationEmail({
      to: email,
      organizationName: organization.name,
      invitedByEmail: context.email,
      role: input.role,
      url: invitationUrl(token),
    })

    revalidatePath('/admin')
    return { ok: true, message: 'Invitation sent.' }
  } catch (error) {
    if (savedInvitationId) {
      await prisma.invitation.deleteMany({ where: { id: savedInvitationId } }).catch(() => undefined)
    }

    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Team invitation failed.',
    }
  }
}

export async function revokeTeamInvitation(invitationId: string): Promise<TeamActionResult> {
  try {
    const context = await requireTenantContext({ permission: 'manageMembers' })

    if (!invitationId.trim()) {
      throw new Error('Invitation id is required.')
    }

    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        organizationId: context.organizationId,
        acceptedAt: null,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    })

    if (!invitation) {
      throw new Error('Invitation not found.')
    }

    if (invitation.role === 'owner' && context.role !== 'owner') {
      throw new Error('Only owners can revoke owner invitations.')
    }

    await prisma.invitation.delete({ where: { id: invitation.id } })
    await writeAuditLog(context, {
      action: 'invitation.revoked',
      resourceType: 'invitation',
      resourceId: invitation.id,
      metadata: {
        email: invitation.email,
        role: invitation.role,
      },
    })

    revalidatePath('/admin')
    return { ok: true, message: 'Invitation revoked.' }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Invitation revoke failed.',
    }
  }
}

export async function removeTeamMember(membershipId: string): Promise<TeamActionResult> {
  try {
    const context = await requireTenantContext({ permission: 'manageMembers' })

    if (!membershipId.trim()) {
      throw new Error('Membership id is required.')
    }

    const membership = await prisma.membership.findFirst({
      where: {
        id: membershipId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        role: true,
        userId: true,
        user: { select: { email: true } },
      },
    })

    if (!membership) {
      throw new Error('Membership not found.')
    }

    if (membership.userId === context.userId) {
      throw new Error('You cannot remove yourself from the team.')
    }

    if (membership.role === 'owner' && context.role !== 'owner') {
      throw new Error('Only owners can remove owner access.')
    }

    if (membership.role === 'owner') {
      await assertAnotherOwnerExists(context.organizationId)
    }

    await prisma.membership.delete({ where: { id: membership.id } })
    await writeAuditLog(context, {
      action: 'membership.removed',
      resourceType: 'membership',
      resourceId: membership.id,
      metadata: {
        email: membership.user.email,
        role: membership.role,
      },
    })

    revalidatePath('/admin')
    return { ok: true, message: 'Teammate removed.' }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Teammate remove failed.',
    }
  }
}

export async function updateMemberRole(formData: FormData) {
  const context = await requireTenantContext({ permission: 'manageMembers' })
  const membershipId = formData.get('membershipId')
  const role = formData.get('role')

  if (typeof membershipId !== 'string' || membershipId.trim().length === 0) {
    throw new Error('Membership id is required.')
  }

  if (!isMembershipRole(role)) {
    throw new Error('Membership role is invalid.')
  }

  if (role === 'owner' && context.role !== 'owner') {
    throw new Error('Only owners can assign owner access.')
  }

  const membership = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      organizationId: context.organizationId,
    },
    select: {
      id: true,
      role: true,
      userId: true,
    },
  })

  if (!membership) {
    throw new Error('Membership not found.')
  }

  if (membership.role === 'owner' && context.role !== 'owner') {
    throw new Error('Only owners can change owner access.')
  }

  if (membership.userId === context.userId && membership.role !== role) {
    throw new Error('You cannot change your own role.')
  }

  if (membership.role === 'owner' && role !== 'owner') {
    await assertAnotherOwnerExists(context.organizationId)
  }

  if (membership.role === role) {
    return
  }

  await prisma.membership.update({
    where: { id: membership.id },
    data: {
      role,
      permissions: [],
    },
  })

  await writeAuditLog(context, {
    action: 'membership.role_updated',
    resourceType: 'membership',
    resourceId: membership.id,
    metadata: {
      previousRole: membership.role,
      nextRole: role,
    },
  })

  revalidatePath('/admin')

  return
}

async function assertAnotherOwnerExists(organizationId: string) {
  const ownerCount = await prisma.membership.count({
    where: {
      organizationId,
      role: 'owner' satisfies MembershipRole,
    },
  })

  if (ownerCount <= 1) {
    throw new Error('At least one owner is required.')
  }
}
