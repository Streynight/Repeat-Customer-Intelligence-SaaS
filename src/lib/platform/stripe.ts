import Stripe from 'stripe'

let stripe: Stripe | null = null

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return null

  if (!stripe) {
    stripe = new Stripe(secretKey, {
      appInfo: {
        name: 'RepeatTree',
        version: '1.0.0',
      },
    })
  }

  return stripe
}

export function requireStripe() {
  const client = getStripe()
  if (!client) throw new Error('STRIPE_SECRET_KEY is required for billing.')
  return client
}
