# RepeatTree: Customer Revenue Intelligence SaaS

RepeatTree is a production-grade Customer Revenue Intelligence platform for ecommerce operators. It is designed to help teams understand repeat purchase behavior, retention, LTV, channel quality, churn risk, lifecycle opportunities, and the actions that increase repeat revenue.

This is not a CSV-first MVP or a demo dashboard. CSV import remains available only as a fallback ingestion path. The production architecture is multi-tenant, database-backed, observable, billable, and built for native ecommerce integrations.

## Product Direction

RepeatTree is a revenue operating system for ecommerce businesses. It must support:

- organizations, workspaces, team memberships, RBAC, and audit logs
- secure tenant isolation derived from the authenticated server session
- subscription billing, plan limits, and usage controls
- native integrations for Shopify, WooCommerce, Stripe, Meta Ads, Google Ads, TikTok Shop, Shopee, and Lazada
- ingestion jobs, raw event capture, normalized orders, identity resolution, metric snapshots, cohort metrics, channel attribution, segments, recommendations, and automation events
- churn alerts, win-back triggers, repeat purchase reminders, VIP detection, revenue anomaly alerts, and operator-grade AI insights

## Required Stack

- Next.js App Router
- TypeScript
- Supabase Auth
- Supabase Postgres
- Prisma
- Redis / Upstash
- Inngest
- Stripe
- Resend
- PostHog
- Sentry

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run prisma:generate
npm run dev
```

Protected product routes require Supabase configuration unless explicit local demo mode is enabled:

```env
ALLOW_LOCAL_DEMO_MODE=true
NEXT_PUBLIC_ALLOW_LOCAL_DEMO_MODE=true
```

Do not enable local demo mode in production.

## Production Environment

Fill `.env.local` or Vercel environment variables for:

- Supabase Auth and Postgres: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`, `DIRECT_URL`
- Jobs and webhooks: `CRON_SECRET`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `INTEGRATION_WEBHOOK_SECRET`
- Platform services: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `POSTHOG_KEY`, `SENTRY_DSN`
- Stripe plans: `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_SCALE`

## Current Architecture

Core production foundations now live in:

- `prisma/schema.prisma`: organizations, workspaces, memberships, billing, integrations, ingestion, identity, metrics, recommendations, automation, and audit logs
- `src/lib/tenancy.ts`: server-derived `TenantContext`
- `src/lib/rbac.ts`: role and permission model
- `src/lib/server/dataset-store.ts`: database dataset persistence boundary
- `src/inngest/*` and `src/app/api/inngest/route.ts`: background job entrypoint
- `src/app/api/billing/stripe/route.ts`: Stripe webhook sync
- `src/app/api/integrations/[provider]/webhook/route.ts`: native integration webhook contract
- `src/app/admin/page.tsx`: read-only operational diagnostics

## Verification

Use this baseline before shipping changes:

```bash
npm run prisma:generate
npm run health:env
npm run typecheck
npm run lint
npm test
npm run build
```

For live database changes, use expand/backfill/contract migrations. Do not force destructive Prisma pushes against production data.

Production migration and deploy verification steps live in `docs/production-migration-runbook.md`.
