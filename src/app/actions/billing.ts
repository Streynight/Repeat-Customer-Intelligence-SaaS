'use server'

import { prisma } from '@/lib/prisma'
import { appUrl } from '@/lib/app-url'
import { createBillingCheckoutForTenant, type BillingCheckoutPlan } from '@/lib/billing/checkout'
import { estimateOrganizationDatabaseStorage, type DatabaseStorageEstimate } from '@/lib/billing/storage'
import { orderedPlans, planCatalog, planLimits, type PlanId } from '@/lib/billing/plans'
import { requireStripe } from '@/lib/platform/stripe'
import { requireTenantContext, writeAuditLog } from '@/lib/tenancy'

type BillingActionResult = {
  url?: string
  error?: string
}

export type { BillingCheckoutPlan } from '@/lib/billing/checkout'

export type BillingPlanView = {
  id: PlanId
  name: string
  priceMonthlyThb: number | null
  positioning: string
  monthlyOrders: number
  workspaces: number
  users: number
  nativeIntegrations: number
  databaseStorageMb: number
  features: string[]
}

export type BillingOverview = {
  current: {
    plan: PlanId
    status: string
    monthlyOrderLimit: number
    monthlyOrderUsage: number
    databaseStorageMbLimit: number
    databaseStorageMbUsage: number
    workspaceLimit: number
    hasStripeCustomer: boolean
  }
  storageEstimate: DatabaseStorageEstimate
  plans: BillingPlanView[]
}

export async function loadBillingOverview(): Promise<BillingOverview> {
  const context = await requireTenantContext({ permission: 'readAnalytics' })
  const subscription = await prisma.billingSubscription.findUnique({
    where: { organizationId: context.organizationId },
    select: {
      plan: true,
      status: true,
      stripeCustomerId: true,
      monthlyOrderLimit: true,
      monthlyOrderUsage: true,
      databaseStorageMbLimit: true,
      databaseStorageMbUsage: true,
      workspaceLimit: true,
    },
  })

  if (!subscription) {
    throw new Error('Billing subscription is required before viewing plan usage.')
  }

  const plan = subscription.plan as PlanId
  const limits = planLimits[plan]
  const storageEstimate = await estimateOrganizationDatabaseStorage(context.organizationId)
  const current = {
    plan,
    status: subscription.status,
    monthlyOrderLimit: limits.monthlyOrders,
    monthlyOrderUsage: subscription.monthlyOrderUsage,
    databaseStorageMbLimit: limits.databaseStorageMb,
    databaseStorageMbUsage: storageEstimate.estimatedMb,
    workspaceLimit: limits.workspaces,
    hasStripeCustomer: Boolean(subscription.stripeCustomerId),
  }

  await prisma.billingSubscription.update({
    where: { organizationId: context.organizationId },
    data: {
      monthlyOrderLimit: limits.monthlyOrders,
      workspaceLimit: limits.workspaces,
      databaseStorageMbLimit: limits.databaseStorageMb,
      databaseStorageMbUsage: storageEstimate.estimatedMb,
    },
  })

  return {
    current,
    storageEstimate,
    plans: orderedPlans.map((planId) => {
      const planEntry = planCatalog[planId]
      return {
        id: planId,
        name: planEntry.name,
        priceMonthlyThb: planEntry.priceMonthlyThb,
        positioning: planEntry.positioning,
        monthlyOrders: planEntry.monthlyOrders,
        workspaces: planEntry.workspaces,
        users: planEntry.users,
        nativeIntegrations: planEntry.nativeIntegrations,
        databaseStorageMb: planEntry.databaseStorageMb,
        features: planEntry.features,
      }
    }),
  }
}

export async function createBillingCheckout(plan: BillingCheckoutPlan): Promise<BillingActionResult> {
  try {
    const context = await requireTenantContext({ permission: 'manageBilling' })
    return { url: await createBillingCheckoutForTenant(context, plan) }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unable to create billing checkout.' }
  }
}

export async function createBillingPortal(): Promise<BillingActionResult> {
  try {
    const context = await requireTenantContext({ permission: 'manageBilling' })
    const stripe = requireStripe()
    const subscription = await prisma.billingSubscription.findUnique({
      where: { organizationId: context.organizationId },
    })

    if (!subscription?.stripeCustomerId) return { error: 'This organization does not have a Stripe customer yet.' }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: appUrl('/settings'),
    })

    await writeAuditLog(context, {
      action: 'billing.portal.created',
      resourceType: 'billing_subscription',
      resourceId: subscription.id,
    })

    return { url: session.url }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unable to create billing portal.' }
  }
}
