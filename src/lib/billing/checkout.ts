import { appUrl } from '@/lib/app-url'
import { planLimits, stripePriceEnvForPlan, type PlanId } from '@/lib/billing/plans'
import { requireStripe } from '@/lib/platform/stripe'
import { prisma } from '@/lib/prisma'
import { type TenantContext, writeAuditLog } from '@/lib/tenancy'

export type BillingCheckoutPlan = Exclude<PlanId, 'enterprise'>

const billingCheckoutPlans = new Set<BillingCheckoutPlan>(['starter', 'growth', 'scale'])

export function parseBillingCheckoutPlan(value: string | null): BillingCheckoutPlan | null {
  if (!value) return null
  return billingCheckoutPlans.has(value as BillingCheckoutPlan) ? value as BillingCheckoutPlan : null
}

export async function createBillingCheckoutForTenant(context: TenantContext, plan: BillingCheckoutPlan) {
  const stripe = requireStripe()
  const priceId = process.env[stripePriceEnvForPlan(plan)]
  if (!priceId) throw new Error(`${stripePriceEnvForPlan(plan)} is not configured.`)
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
    cancel_url: appUrl('/pricing?checkout=cancelled'),
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

  if (!session.url) throw new Error('Billing checkout did not return a URL.')
  return session.url
}

async function createStripeCustomer(organizationId: string, email: string) {
  const stripe = requireStripe()
  const customer = await stripe.customers.create({
    email,
    metadata: { organizationId },
  })

  return customer.id
}
