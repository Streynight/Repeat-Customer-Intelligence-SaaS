# Production Migration Runbook

RepeatTree migrations must use expand, backfill, verify, then contract. Do not run destructive schema pushes against production data.

## Tenancy Backfill

The tenancy backfill migrates legacy `users` and `stores.user_id` records into organizations, workspaces, memberships, billing subscriptions, and workspace-scoped stores.

### Dry Run

```bash
npm run prisma:generate
npm run tenancy:backfill:dry-run
```

Review:

- `Users scanned`
- `Users needing backfill`
- each planned action count
- `Orphan stores needing manual review`
- sampled users with planned changes

For a smaller rehearsal:

```bash
npx tsx scripts/backfill-tenancy.ts --limit 10
npx tsx scripts/backfill-tenancy.ts --user-id <user_id>
```

### Apply

Apply only after the dry-run counts match expectations:

```bash
npm run tenancy:backfill
```

The command is idempotent. A second dry run after apply should show zero planned actions for migrated users.

### Rollback Notes

Prefer forward fixes over rollback. If a bad deploy is detected:

- pause ingestion jobs and webhooks before changing data again
- restore from the latest Supabase PITR/snapshot if tenant ownership was corrupted
- otherwise run a corrective forward migration for the affected organization or workspace IDs
- keep audit and billing records intact unless support has confirmed the customer impact

### Post-Deploy Checks

```bash
npm run release:verify
npm run health:live
```

If production secrets are not available in the local shell yet, use `npm run release:verify:code` for code validation only. Do not promote until `npm run health:env` succeeds against the target environment.

For Vercel or uptime checks, use:

```bash
npm run health:dns
curl https://<deployment-url>/api/health
curl -H "x-health-secret: $HEALTHCHECK_SECRET" "https://<deployment-url>/api/health?deep=1"
```

The public health route returns only a summary. The deep health route requires `HEALTHCHECK_SECRET` and can probe live dependencies.

For Cloudflare-managed `repeattree.com`, the web cutover should have one apex A record pointing to Vercel and one `www` CNAME pointing to the Vercel DNS target shown by project domain inspection. Use Vercel's domain inspector for the exact target before cutover.

For Resend sender verification, add the provider-generated DNS records from the Resend domain details page. The default Resend pattern uses `send.<domain>` MX/TXT records for SPF feedback and Amazon SES authorization, plus `resend._domainkey.<domain>` TXT for DKIM. Do not guess the DKIM value; copy it from Resend.

If `npm run health:live` reports Redis / Upstash `WRONGPASS`, treat it as a deploy blocker caused by a mismatched, revoked, or disabled Upstash REST token for the configured REST URL. Rotate or copy the current REST token from the same Upstash database, update local and Vercel production env, then re-run `npm run health:live`.

### Production Readiness Blockers

Do not promote a deployment while any of these are true:

- `npm run health:env` reports missing required Redis, Inngest, Stripe, Resend, PostHog, Sentry, cron, or webhook environment variables
- `npm run health:live` reports Redis / Upstash, Prisma, or Stripe failures against the target production environment
- `npm run health:dns` reports missing apex, `www`, Resend SPF MX/TXT, Resend DKIM, or other required domain records
- `ALLOW_LOCAL_DEMO_MODE` or `NEXT_PUBLIC_ALLOW_LOCAL_DEMO_MODE` is enabled for a non-localhost `NEXT_PUBLIC_APP_URL`
- the `automation_events.idempotency_key` migration has not been applied before deploying workflow code that writes lifecycle automation events
