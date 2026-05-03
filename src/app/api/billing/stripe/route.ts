import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { syncCheckoutSessionToBilling, syncSubscriptionToBilling } from '@/lib/billing/stripe-webhook'
import { captureOperationalError, recordSystemEvent } from '@/lib/observability'
import { prisma } from '@/lib/prisma'
import { requireStripe } from '@/lib/platform/stripe'

export async function POST(request: Request) {
  const stripe = requireStripe()
  const signature = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return NextResponse.json({ ok: false, error: 'Stripe webhook is not configured.' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret)
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Invalid Stripe signature.' },
      { status: 400 },
    )
  }

  try {
    let syncResult: Awaited<ReturnType<typeof syncCheckoutSessionToBilling | typeof syncSubscriptionToBilling>> | null = null

    if (event.type === 'checkout.session.completed') {
      syncResult = await syncCheckoutSessionToBilling(prisma.billingSubscription, event.data.object as Stripe.Checkout.Session)
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      syncResult = await syncSubscriptionToBilling(prisma.billingSubscription, event.data.object as Stripe.Subscription)
    }

    recordSystemEvent({
      event: 'billing_stripe_webhook_processed',
      properties: {
        stripeEventId: event.id,
        stripeEventType: event.type,
        ...syncResult,
      },
    })
  } catch (error) {
    captureOperationalError(error, {
      operation: 'billing.stripe_webhook',
      properties: {
        stripeEventId: event.id,
        stripeEventType: event.type,
      },
    })

    return NextResponse.json({ ok: false, error: 'Stripe webhook could not be processed.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
