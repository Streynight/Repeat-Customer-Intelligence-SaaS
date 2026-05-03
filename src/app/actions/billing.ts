'use server'

import { prisma } from '@/lib/prisma'
import { stripePriceEnvForPlan, type PlanId } from '@/lib/billing/plans'
import { requireStripe } from '@/lib/platform/stripe'
import { requireTenantContext, writeAuditLog } from '@/lib/tenancy'

type BillingActionResult = {
  url?: string
  error?: string
}

export async function createBillingCheckout(plan: Exclude<PlanId, 'enterprise'>): Promise<BillingActionResult> {
  try {
    const context = await requireTenantContext({ permission: 'manageBilling' })
    const stripe = requireStripe()
    const priceId = process.env[stripePriceEnvForPlan(plan)]
    if (!priceId) return { error: `${stripePriceEnvForPlan(plan)} is not configured.` }

    const subscription = await prisma.billingSubscription.upsert({
      where: { organizationId: context.organizationId },
      update: {},
      create: {
        organizationId: context.organizationId,
        plan,
        status: 'trialing',
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
      success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/settings?billing=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/settings?billing=cancelled`,
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
      return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/settings`,
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
