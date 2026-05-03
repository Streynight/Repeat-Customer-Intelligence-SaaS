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
npm run health:env
npm run health:live
npm run typecheck
npm run lint
npm test
npm run build
```

For Vercel or uptime checks, use:

```bash
curl https://<deployment-url>/api/health
curl -H "x-health-secret: $HEALTHCHECK_SECRET" "https://<deployment-url>/api/health?deep=1"
```

The public health route returns only a summary. The deep health route requires `HEALTHCHECK_SECRET` and can probe live dependencies.
