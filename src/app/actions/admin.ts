'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { isMembershipRole, type MembershipRole } from '@/lib/rbac'
import { requireTenantContext, writeAuditLog } from '@/lib/tenancy'

export async function loadAdminDiagnostics() {
  const context = await requireTenantContext({ permission: 'viewAdmin' })
  const [organization, ingestionFailures, recentAuditLogs] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: context.organizationId },
      include: {
        billingSubscription: true,
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
    currentUserRole: context.role,
    organization: organization ? {
      id: organization.id,
      name: organization.name,
      plan: organization.billingSubscription?.plan ?? 'starter',
      billingStatus: organization.billingSubscription?.status ?? 'trialing',
      members: organization.memberships.map((membership) => ({
        id: membership.id,
        email: membership.user.email,
        role: membership.role,
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
    },
  })

  if (!membership) {
    throw new Error('Membership not found.')
  }

  if (membership.role === 'owner' && context.role !== 'owner') {
    throw new Error('Only owners can change owner access.')
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
