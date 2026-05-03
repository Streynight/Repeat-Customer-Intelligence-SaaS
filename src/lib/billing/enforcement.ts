import { prisma } from '@/lib/prisma'
import { isWithinPlanLimit, type PlanId } from '@/lib/billing/plans'
import type { TenantContext } from '@/lib/tenancy'

const billableStatuses = ['active', 'trialing'] as const

type BillingSubscriptionSnapshot = {
  organizationId: string
  plan: PlanId
  status: string
  monthlyOrderLimit: number
  monthlyOrderUsage: number
}

export async function reserveImportOrderUsage(context: TenantContext, orderCount: number) {
  return reserveImportOrderUsageForOrganization(context.organizationId, orderCount)
}

export async function reserveImportOrderUsageForStore(storeId: string, orderCount: number) {
  if (orderCount <= 0) {
    return { release: async () => undefined }
  }

  const store = await prisma.store.findFirst({
    where: { id: storeId },
    select: { workspace: { select: { organizationId: true } } },
  })

  const organizationId = store?.workspace?.organizationId
  if (!organizationId) {
    throw new Error('Store is not attached to a billable organization.')
  }

  return reserveImportOrderUsageForOrganization(organizationId, orderCount)
}

async function reserveImportOrderUsageForOrganization(organizationId: string, orderCount: number) {
  if (orderCount <= 0) {
    return { release: async () => undefined }
  }

  const subscription = await requireBillableSubscriptionForOrganization(organizationId)
  if (!isWithinPlanLimit(subscription.plan, 'monthlyOrders', subscription.monthlyOrderUsage + orderCount)) {
    throw new Error('Monthly order limit reached for this organization.')
  }

  const result = await prisma.billingSubscription.updateMany({
    where: {
      organizationId,
      status: { in: [...billableStatuses] },
      monthlyOrderUsage: { lte: subscription.monthlyOrderLimit - orderCount },
    },
    data: {
      monthlyOrderUsage: { increment: orderCount },
    },
  })

  if (result.count !== 1) {
    throw new Error('Monthly order limit reached for this organization.')
  }

  let released = false
  return {
    release: async () => {
      if (released) return
      released = true
      await prisma.billingSubscription.updateMany({
        where: { organizationId },
        data: { monthlyOrderUsage: { decrement: orderCount } },
      })
    },
  }
}

export async function assertCanCreateNativeIntegration(context: TenantContext) {
  const subscription = await requireBillableSubscription(context)
  const activeIntegrationCount = await prisma.integrationConnection.count({
    where: {
      workspace: { organizationId: context.organizationId },
      provider: { not: 'csv' },
      status: { not: 'disconnected' },
    },
  })

  if (!isWithinPlanLimit(subscription.plan, 'nativeIntegrations', activeIntegrationCount + 1)) {
    throw new Error('Native integration limit reached for this organization.')
  }

  return subscription
}

export async function requireBillableSubscription(context: TenantContext): Promise<BillingSubscriptionSnapshot> {
  return requireBillableSubscriptionForOrganization(context.organizationId)
}

async function requireBillableSubscriptionForOrganization(organizationId: string): Promise<BillingSubscriptionSnapshot> {
  const subscription = await prisma.billingSubscription.findUnique({
    where: { organizationId },
    select: {
      organizationId: true,
      plan: true,
      status: true,
      monthlyOrderLimit: true,
      monthlyOrderUsage: true,
    },
  })

  if (!subscription) {
    throw new Error('Billing subscription is required before using production workspace features.')
  }

  if (!billableStatuses.includes(subscription.status as (typeof billableStatuses)[number])) {
    throw new Error('Subscription is not active for this organization.')
  }

  const plan = subscription.plan as PlanId

  return {
    organizationId: subscription.organizationId,
    plan,
    status: subscription.status,
    monthlyOrderLimit: subscription.monthlyOrderLimit,
    monthlyOrderUsage: subscription.monthlyOrderUsage,
  }
}

export function billableStatusList() {
  return [...billableStatuses]
}
