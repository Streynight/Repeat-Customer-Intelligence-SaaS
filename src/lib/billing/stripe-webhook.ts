import type Stripe from 'stripe'
import { planLimits, type PlanId } from '@/lib/billing/plans'

type BillingSubscriptionWriter = {
  upsert(args: unknown): Promise<unknown>
  updateMany(args: unknown): Promise<unknown>
}

export async function syncCheckoutSessionToBilling(
  billingSubscription: BillingSubscriptionWriter,
  session: Stripe.Checkout.Session,
) {
  const organizationId = session.metadata?.organizationId
  const plan = normalizeStripePlan(session.metadata?.plan)

  if (!organizationId || !session.customer) return

  await billingSubscription.upsert({
    where: { organizationId },
    update: {
      stripeCustomerId: String(session.customer),
      plan,
      monthlyOrderLimit: planLimits[plan].monthlyOrders,
      workspaceLimit: planLimits[plan].workspaces,
    },
    create: {
      organizationId,
      stripeCustomerId: String(session.customer),
      plan,
      monthlyOrderLimit: planLimits[plan].monthlyOrders,
      workspaceLimit: planLimits[plan].workspaces,
    },
  })
}

export async function syncSubscriptionToBilling(
  billingSubscription: BillingSubscriptionWriter,
  subscription: Stripe.Subscription,
) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
  const plan = normalizeStripePlan(subscription.metadata?.plan)
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end

  await billingSubscription.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      stripeSubscriptionId: subscription.id,
      status: normalizeStripeStatus(subscription.status),
      plan,
      monthlyOrderLimit: planLimits[plan].monthlyOrders,
      workspaceLimit: planLimits[plan].workspaces,
      currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
    },
  })
}

export function normalizeStripePlan(value: string | undefined): PlanId {
  if (value === 'growth' || value === 'scale' || value === 'enterprise') return value
  return 'starter'
}

export function normalizeStripeStatus(status: Stripe.Subscription.Status) {
  if (status === 'active' || status === 'trialing' || status === 'past_due' || status === 'canceled' || status === 'incomplete') {
    return status
  }

  return 'past_due'
}
