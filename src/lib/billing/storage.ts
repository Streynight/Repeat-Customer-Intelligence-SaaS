import { prisma } from '@/lib/prisma'

const rowSizeKb = {
  customerProfile: 3,
  order: 2,
  orderItem: 1,
  import: 2,
  csvSyncConnection: 4,
  csvSyncRun: 2,
  integrationConnection: 4,
  ingestionJob: 3,
  rawEvent: 8,
  normalizedOrder: 4,
  customerIdentity: 1,
  customerMetricSnapshot: 3,
  cohortMetric: 1,
  channelAttribution: 1,
  segment: 2,
  recommendation: 3,
  automationRule: 2,
  automationEvent: 2,
  project: 2,
  projectShare: 1,
  projectTask: 1,
  auditLog: 2,
} as const

export type DatabaseStorageEstimate = {
  estimatedMb: number
  estimatedKb: number
  rows: Record<keyof typeof rowSizeKb, number>
}

export async function estimateOrganizationDatabaseStorage(organizationId: string): Promise<DatabaseStorageEstimate> {
  const [
    customerProfile,
    order,
    orderItem,
    importCount,
    csvSyncConnection,
    csvSyncRun,
    integrationConnection,
    ingestionJob,
    rawEvent,
    normalizedOrder,
    customerIdentity,
    customerMetricSnapshot,
    cohortMetric,
    channelAttribution,
    segment,
    recommendation,
    automationRule,
    automationEvent,
    project,
    projectShare,
    projectTask,
    auditLog,
  ] = await Promise.all([
    prisma.customerProfile.count({ where: { store: { workspace: { organizationId } } } }),
    prisma.order.count({ where: { store: { workspace: { organizationId } } } }),
    prisma.orderItem.count({ where: { order: { store: { workspace: { organizationId } } } } }),
    prisma.import.count({ where: { store: { workspace: { organizationId } } } }),
    prisma.csvSyncConnection.count({ where: { store: { workspace: { organizationId } } } }),
    prisma.csvSyncRun.count({ where: { store: { workspace: { organizationId } } } }),
    prisma.integrationConnection.count({ where: { workspace: { organizationId } } }),
    prisma.ingestionJob.count({ where: { workspace: { organizationId } } }),
    prisma.rawEvent.count({ where: { workspace: { organizationId } } }),
    prisma.normalizedOrder.count({ where: { workspace: { organizationId } } }),
    prisma.customerIdentity.count({ where: { workspace: { organizationId } } }),
    prisma.customerMetricSnapshot.count({ where: { workspace: { organizationId } } }),
    prisma.cohortMetric.count({ where: { workspace: { organizationId } } }),
    prisma.channelAttribution.count({ where: { workspace: { organizationId } } }),
    prisma.segment.count({ where: { workspace: { organizationId } } }),
    prisma.recommendation.count({ where: { workspace: { organizationId } } }),
    prisma.automationRule.count({ where: { workspace: { organizationId } } }),
    prisma.automationEvent.count({ where: { workspace: { organizationId } } }),
    prisma.project.count({ where: { organizationId } }),
    prisma.projectShare.count({ where: { project: { organizationId } } }),
    prisma.projectTask.count({ where: { project: { organizationId } } }),
    prisma.auditLog.count({ where: { organizationId } }),
  ])
  const rows = {
    customerProfile,
    order,
    orderItem,
    import: importCount,
    csvSyncConnection,
    csvSyncRun,
    integrationConnection,
    ingestionJob,
    rawEvent,
    normalizedOrder,
    customerIdentity,
    customerMetricSnapshot,
    cohortMetric,
    channelAttribution,
    segment,
    recommendation,
    automationRule,
    automationEvent,
    project,
    projectShare,
    projectTask,
    auditLog,
  }
  const estimatedKb = Object.entries(rows).reduce((total, [key, count]) => (
    total + rowSizeKb[key as keyof typeof rowSizeKb] * count
  ), 0)

  return {
    estimatedKb,
    estimatedMb: Math.max(1, Math.ceil(estimatedKb / 1024)),
    rows,
  }
}
