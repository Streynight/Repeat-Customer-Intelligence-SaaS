'use server'

import { prisma } from '@/lib/prisma'
import { appUrl } from '@/lib/app-url'
import { estimateOrganizationDatabaseStorage, type DatabaseStorageEstimate } from '@/lib/billing/storage'
import { orderedPlans, planCatalog, planLimits, stripePriceEnvForPlan, type PlanId } from '@/lib/billing/plans'
import { requireStripe } from '@/lib/platform/stripe'
import { requireTenantContext, writeAuditLog } from '@/lib/tenancy'

type BillingActionResult = {
  url?: string
  error?: string
}

export type BillingCheckoutPlan = Exclude<PlanId, 'enterprise'>

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
    const stripe = requireStripe()
    const priceId = process.env[stripePriceEnvForPlan(plan)]
    if (!priceId) return { error: `${stripePriceEnvForPlan(plan)} is not configured.` }
    const limits = planLimits[plan]

    const subscription = await prisma.billingSubscription.upsert({
      where: { organizationId: context.organizationId },
      update: {
        monthlyOrderLimit: limits.monthlyOrders,
        workspaceLimit: limits.workspaces,
        databaseStorageMbLimit: limits.databaseStorageMb,
      },
      create: {
        organizationId: context.organizationId,
        plan,
        status: 'trialing',
        monthlyOrderLimit: limits.monthlyOrders,
        workspaceLimit: limits.workspaces,
        databaseStorageMbLimit: limits.databaseStorageMb,
      },
    })
    const customerId = subscription.stripeCustomerId ?? await createStripeCustomer(context.organizationId, context.email)
    if (!subscription.stripeCustomerId) {
      await prisma.billingSubscription.update({
        where: { organizationId: context.organizationId },
        data: { stripeCustomerId: customerId },
      })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: appUrl('/settings?billing=success'),
      cancel_url: appUrl('/settings?billing=cancelled'),
      metadata: {
        organizationId: context.organizationId,
        plan,
      },
    })

    await writeAuditLog(context, {
      action: 'billing.checkout.created',
      resourceType: 'billing_subscription',
      resourceId: subscription.id,
      metadata: { plan },
    })

    return { url: session.url ?? undefined }
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

async function createStripeCustomer(organizationId: string, email: string) {
  const stripe = requireStripe()
  const customer = await stripe.customers.create({
    email,
    metadata: { organizationId },
  })

  return customer.id
}
