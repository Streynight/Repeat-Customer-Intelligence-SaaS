'use server'

import { prisma } from '@/lib/prisma'
import { assertCanCreateNativeIntegration } from '@/lib/billing/enforcement'
import { captureOperationalError, recordTenantEvent } from '@/lib/observability'
import { getIntegrationContract, nativeIntegrationContracts, type NativeIntegrationProvider } from '@/lib/integrations/providers'
import { requireTenantContext, writeAuditLog } from '@/lib/tenancy'

export async function listIntegrationConnections() {
  const context = await requireTenantContext({ permission: 'readAnalytics' })
  const connections = await prisma.integrationConnection.findMany({
    where: { workspaceId: context.workspaceId },
    orderBy: { createdAt: 'desc' },
  })

  return nativeIntegrationContracts.map((contract) => {
    const connection = connections.find((item) => item.provider === contract.provider)

    return {
      ...contract,
      connection: connection ? {
        id: connection.id,
        status: connection.status,
        name: connection.name,
        lastSyncAt: connection.lastSyncAt?.toISOString(),
      } : null,
    }
  })
}

export async function createIntegrationConnection(input: {
  provider: NativeIntegrationProvider
  name?: string
  externalAccountId?: string
  scopes?: string[]
}) {
  const context = await requireTenantContext({ permission: 'manageIntegrations' })

  try {
    const contract = getIntegrationContract(input.provider)
    if (!contract) throw new Error('Unsupported integration provider.')

    const existing = await prisma.integrationConnection.findFirst({
      where: {
        workspaceId: context.workspaceId,
        provider: input.provider,
        status: { not: 'disconnected' },
      },
      select: { id: true, status: true },
    })
    if (existing) return existing

    await assertCanCreateNativeIntegration(context)

    const connection = await prisma.integrationConnection.create({
      data: {
        workspaceId: context.workspaceId,
        provider: input.provider,
        name: input.name?.trim() || contract.label,
        externalAccountId: input.externalAccountId ?? null,
        credentialsRef: null,
        scopes: input.scopes ?? [],
        status: 'action_required',
        metadata: { authModel: contract.authModel, capabilities: contract.capabilities },
      },
    })

    await writeAuditLog(context, {
      action: 'integration.connection.created',
      resourceType: 'integration_connection',
      resourceId: connection.id,
      metadata: { provider: input.provider },
    })
    recordTenantEvent({
      event: 'integration_connection_created',
      tenant: context,
      properties: { provider: input.provider, connectionId: connection.id },
    })

    return { id: connection.id, status: connection.status }
  } catch (error) {
    captureOperationalError(error, {
      operation: 'integration.connection.create',
      tenant: context,
      properties: { provider: input.provider },
    })
    throw error
  }
}

export async function disconnectIntegrationConnection(id: string) {
  const context = await requireTenantContext({ permission: 'manageIntegrations' })
  const connection = await prisma.integrationConnection.findFirst({
    where: { id, workspaceId: context.workspaceId },
  })
  if (!connection) throw new Error('Integration connection not found')

  await prisma.integrationConnection.update({
    where: { id },
    data: { status: 'disconnected' },
  })
  await writeAuditLog(context, {
    action: 'integration.connection.disconnected',
    resourceType: 'integration_connection',
    resourceId: id,
    metadata: { provider: connection.provider },
  })
}
