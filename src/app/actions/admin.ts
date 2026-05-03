'use server'

import { prisma } from '@/lib/prisma'
import { requireTenantContext } from '@/lib/tenancy'

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
