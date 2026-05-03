import { PostHog } from 'posthog-node'

let posthog: PostHog | null = null

export function getPostHog() {
  const apiKey = process.env.POSTHOG_KEY
  if (!apiKey) return null

  if (!posthog) {
    posthog = new PostHog(apiKey, {
      host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
      flushAt: 20,
      flushInterval: 10_000,
    })
  }

  return posthog
}

export function captureProductEvent(input: {
  distinctId: string
  event: string
  properties?: Record<string, unknown>
}) {
  const client = getPostHog()
  if (!client) return

  client.capture({
    distinctId: input.distinctId,
    event: input.event,
    properties: input.properties,
  })
}
