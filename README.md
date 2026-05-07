# RepeatTree

**Customer Revenue Intelligence for ecommerce operators in Southeast Asia.**

RepeatTree helps Shopify, TikTok Shop, Shopee, and Lazada merchants understand who buys repeatedly, who is about to churn, and which actions move revenue — powered by Claude AI and built on a production-grade multi-tenant SaaS architecture.

> Built solo in 4 days · 39 commits · TypeScript strict · production-ready infrastructure

---

## What it does

| Feature | Description |
|---|---|
| **Retention analytics** | MRR waterfall, NRR/GRR, cohort retention grids by month |
| **RFM segmentation** | Champion, Loyal, At-Risk, Lost — recomputed on every sync |
| **AI operator insights** | Streaming Claude-powered recommendations based on live workspace metrics |
| **Lifecycle automation** | Churn alerts, win-back triggers, VIP protection, second-purchase nudges |
| **Shopify integration** | Full sync, incremental sync, webhook-driven real-time ingestion |
| **Marketplace imports** | Shopee, TikTok Shop, Lazada CSV/XLSX with auto column mapping |
| **Multi-tenant SaaS** | Organizations, workspaces, RBAC, audit logs, Stripe billing |
| **Localization** | English + Thai (ภาษาไทย) |

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 App Router, React 19, Tailwind CSS v4, shadcn/ui |
| Language | TypeScript (strict mode, zero `any`) |
| Database | Supabase Postgres + Prisma ORM (771-line schema) |
| Auth | Supabase Auth — server session only, never client-side |
| Background jobs | Inngest — event-driven, step functions, retry-safe |
| Cache / locks | Upstash Redis — rate limiting, idempotency, distributed locks |
| Billing | Stripe — subscriptions, free trials, plan limits |
| AI | Anthropic Claude API — streaming responses, prompt caching |
| Email | Resend |
| Analytics | PostHog |
| Errors | Sentry |
| Deployment | Vercel |

---

## Architecture

### Tenant isolation
Every database query is scoped to `organizationId` or `workspaceId`, enforced at the service layer — not at the route level. `TenantContext` is derived from the Supabase server session. Client-side session is never trusted.

### Event-driven background jobs
Long-running work (metric recomputation, Shopify syncs, automation event dispatch) runs as Inngest step functions. Each job records an `IngestionJob` before processing — safe to retry, safe to replay.

### Distributed locking
Metric recompute jobs acquire a Redis lock before execution. Concurrent webhook events cannot trigger duplicate pipeline runs.

### Billing-gated features
Feature access checks `BillingSubscription` before execution. Plan limits are enforced server-side — never just hidden in the UI.

### AI insights
`src/lib/ai/operator-insights.ts` maps live workspace metrics (RFM distribution, repeat rate, revenue at risk) to actionable Claude-generated recommendations. Streamed to the client with Anthropic's streaming API and prompt caching.

---

## Data model (key entities)

```
Organization → Workspace → Store
                        → IntegrationConnection (Shopify, etc.)
                        → NormalizedOrder → CustomerIdentity
                        → CustomerMetricSnapshot (RFM, LTV, churn score)
                        → CohortMetric
                        → Segment → AutomationRule → AutomationEvent
                        → Recommendation
Organization → BillingSubscription (Stripe)
Organization → Membership (RBAC) → AuditLog
```

---

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

For local dev without Supabase:

```env
ALLOW_LOCAL_DEMO_MODE=true
NEXT_PUBLIC_ALLOW_LOCAL_DEMO_MODE=true
```

---

## Verification

```bash
npm run release:verify
```

Runs TypeScript strict check, architecture boundary validation, and production health checks.
See `docs/production-migration-runbook.md` for full deploy steps.

---

## Built by

**Streynight** — self-taught AI/ML engineer with a background in Culinary Arts & Design.
Building at the intersection of AI, product, and Southeast Asian ecommerce.

→ [github.com/Streynight](https://github.com/Streynight)
