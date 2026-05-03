import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { syncCheckoutSessionToBilling, syncSubscriptionToBilling } from '@/lib/billing/stripe-webhook'
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

  if (event.type === 'checkout.session.completed') {
    await syncCheckoutSessionToBilling(prisma.billingSubscription, event.data.object as Stripe.Checkout.Session)
  }

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    await syncSubscriptionToBilling(prisma.billingSubscription, event.data.object as Stripe.Subscription)
  }

  return NextResponse.json({ ok: true })
}
