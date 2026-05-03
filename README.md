# RepeatTree: Repeat Customer Intelligence SaaS

RepeatTree is a CSV-first MVP for small ecommerce merchants who sell across Shopee, TikTok Shop, Instagram, Facebook, website, and custom order sheets.

It answers the first questions a merchant asks after importing orders:

- Who buys repeatedly?
- Who is VIP?
- Who is at risk or lost?
- Which channels create the highest repeat revenue?
- Where did repeat customers first buy, and where did they come back?
- Which cohorts, RFM segments, and products deserve attention next?
- What is total gross income, estimated VAT, and a simple net snapshot?

This is not a generic CRM. It is a repeat customer intelligence dashboard.

## Current Mode

The app is currently optimized for clean-account MVP testing.

- New accounts start with an empty workspace: no demo customers, orders, imports, or revenue.
- Imported data is saved through Supabase/Prisma when configured, with browser `localStorage` as the local fallback.
- If Supabase environment variables are missing, protected pages stay open for local clean-workspace testing.
- Sample CSV data is opt-in from `/imports`; it is never auto-loaded on signup.
- No live marketplace APIs are implemented yet.
- Scheduled CSV sync is available for merchant-provided HTTPS CSV export URLs.
- Auth supports username/password accounts and optional Google sign-in when Supabase is configured.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma schema for Postgres
- Supabase auth scaffolding
- Supabase Email/Password and Google OAuth sign-in
- Recharts
- PapaParse CSV parsing

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open:

```text
http://localhost:3000
http://localhost:3000/dashboard
http://localhost:3000/analytics
http://localhost:3000/income
http://localhost:3000/imports
```

## Useful Scripts

```bash
npm run dev              # start local dev server
npm run lint             # run ESLint
npm run build            # production build
npm run prisma:generate  # generate Prisma client
```

## Environment Variables

See `.env.example`.

For demo mode, Supabase values can stay empty. For production auth/database work, fill:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET`

No secrets should be committed.

For username/password and Google sign-in:

- Enable Email/Password in Supabase Auth.
- Enable Google in Supabase Auth Providers.
- Add `http://localhost:3000/auth/callback` and your deployed `/auth/callback` URL to Supabase redirect URLs.
- Google is used only for sign-up/sign-in identity. RepeatTree does not request Gmail API scopes or read inbox data.

For scheduled CSV sync:

- Add `CRON_SECRET` in local/Vercel env vars.
- Vercel Cron calls `GET /api/sync/csv` hourly.
- The route requires `Authorization: Bearer $CRON_SECRET`.

## Demo Flow

1. Open `/dashboard`.
2. Confirm the workspace is empty and click the import CTA.
3. Open `/imports`.
4. Click “Try sample” for Shopee, TikTok Shop, or Custom CSV.
5. Confirm import.
6. Return to `/dashboard` and read the top insight cards:
   - best repeat channel
   - top channel path
   - remarketing revenue at risk
7. Open `/analytics` to inspect cohorts, RFM segments, product repeat intelligence, and opportunity lists.
8. Open `/income` to review gross income, net snapshot, VAT estimate, and channel income.
9. Open `/income?tab=sync` to add an HTTPS CSV URL when testing auto-sync.
10. Open `/customers`.
11. Export Repeat, VIP, RFM, product, or At Risk customer groups.
12. Open a customer profile to inspect merged identity and channel journey.

## Testing Real Merchant CSVs

Use `/imports`.

Required fields:

- order ID
- customer name
- order date
- total amount

Strongly recommended fields:

- phone
- email
- product name
- source channel

Optional finance fields:

- `tax_amount`
- `discount_amount`
- `shipping_amount`
- `platform_fee_amount`
- `refund_amount`

Identity matching works best when phone or email exists. If both are missing, the MVP falls back to fuzzy customer name matching.

See `docs/csv-import-guide.md` for mapping examples and common issues.

## Data Model

The Prisma schema is in `prisma/schema.prisma`.

Core tables:

- users
- stores
- customer_profiles
- orders
- order_items
- imports
- csv_sync_connections
- csv_sync_runs

The current UI starts from an empty workspace, then uses Supabase/Prisma or local fallback data after imports.

`users` stores the Supabase user id, email, and unique lowercase username used for username-based login.

## Deployment Readiness

The app is Vercel-ready as a Next.js project.

Before deploying a real beta:

- create a Supabase project
- enable Email/Password and Google auth providers
- set auth redirect URLs
- provide Vercel environment variables
- set `CRON_SECRET` for scheduled CSV sync
- run Prisma migration against Supabase Postgres
- run end-to-end checks against server actions/database writes

## Verification Checklist

```bash
npm run lint
npm run build
```

Manual checks:

- dashboard starts empty without Supabase env vars
- sample CSV imports correctly
- duplicate buyers merge by phone/email
- analytics shows cohorts, RFM segments, channel quality, product repeat data, and opportunities
- income shows gross income, net snapshot, VAT estimates, channel income, and CSV sync controls
- customer status labels make sense
- Repeat/VIP/At Risk exports download CSV files
- customer detail pages show merged channels and purchase history
