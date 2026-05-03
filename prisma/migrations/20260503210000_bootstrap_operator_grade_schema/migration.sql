-- Bootstrap the operator-grade SaaS schema without rewriting existing legacy data.
-- This migration is intentionally idempotent because production already has the
-- legacy commerce tables but no Prisma migration baseline.

DO $$ BEGIN
  CREATE TYPE "SourceChannel" AS ENUM ('shopee', 'tiktok', 'instagram', 'facebook', 'website', 'csv');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CustomerStatus" AS ENUM ('New', 'Repeat', 'VIP', 'AtRisk', 'Lost');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ImportStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CsvSyncStatus" AS ENUM ('success', 'failed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MembershipRole" AS ENUM ('owner', 'admin', 'analyst', 'billing', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "Permission" AS ENUM ('manageOrganization', 'manageMembers', 'manageBilling', 'manageIntegrations', 'manageWorkspace', 'manageImports', 'manageAutomations', 'readAnalytics', 'viewAdmin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionPlan" AS ENUM ('starter', 'growth', 'scale', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'incomplete');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "IntegrationProvider" AS ENUM ('shopify', 'woocommerce', 'stripe', 'meta_ads', 'google_ads', 'tiktok_shop', 'shopee', 'lazada', 'csv');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "IntegrationStatus" AS ENUM ('disconnected', 'connected', 'action_required', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "IngestionJobType" AS ENUM ('fullSync', 'incrementalSync', 'webhookImport', 'csvImport', 'metricRecompute');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "IngestionJobStatus" AS ENUM ('queued', 'running', 'succeeded', 'failed', 'canceled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RawEventStatus" AS ENUM ('received', 'normalized', 'failed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CustomerIdentityType" AS ENUM ('email', 'phone', 'externalCustomerId', 'platformId', 'lineId', 'fuzzyName');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AttributionModel" AS ENUM ('firstTouch', 'lastTouch', 'linear');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SegmentType" AS ENUM ('rfm', 'lifecycle', 'revenue', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RecommendationType" AS ENUM ('churnRisk', 'winBack', 'secondPurchase', 'vipProtect', 'crossSell', 'anomaly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RecommendationPriority" AS ENUM ('high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RecommendationStatus" AS ENUM ('open', 'accepted', 'dismissed', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RecommendationSource" AS ENUM ('rule', 'ai');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AutomationType" AS ENUM ('churnAlert', 'winBack', 'repeatReminder', 'vipDetected', 'revenueAnomaly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AutomationEventStatus" AS ENUM ('queued', 'sent', 'skipped', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "organizations" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "created_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "workspaces" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "memberships" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" "MembershipRole" NOT NULL DEFAULT 'owner',
  "permissions" "Permission"[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "invitations" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "MembershipRole" NOT NULL DEFAULT 'viewer',
  "token_hash" TEXT NOT NULL,
  "invited_by_user_id" TEXT,
  "accepted_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "workspace_id" TEXT,
  "actor_user_id" TEXT,
  "action" TEXT NOT NULL,
  "resource_type" TEXT NOT NULL,
  "resource_id" TEXT,
  "metadata" JSONB,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "billing_subscriptions" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "stripe_customer_id" TEXT,
  "stripe_subscription_id" TEXT,
  "plan" "SubscriptionPlan" NOT NULL DEFAULT 'starter',
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'trialing',
  "current_period_end" TIMESTAMP(3),
  "monthly_order_limit" INTEGER NOT NULL DEFAULT 10000,
  "monthly_order_usage" INTEGER NOT NULL DEFAULT 0,
  "workspace_limit" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "stores" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT,
  "user_id" TEXT,
  "name" TEXT NOT NULL,
  "tax_country" TEXT NOT NULL DEFAULT 'TH',
  "tax_label" TEXT NOT NULL DEFAULT 'VAT',
  "tax_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.07,
  "tax_included" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "tax_country" TEXT NOT NULL DEFAULT 'TH';
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "tax_label" TEXT NOT NULL DEFAULT 'VAT';
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "tax_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.07;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "tax_included" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "stores" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "stores" DROP CONSTRAINT IF EXISTS "stores_user_id_fkey";

CREATE TABLE IF NOT EXISTS "customer_profiles" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "line_id" TEXT,
  "province" TEXT,
  "first_channel" "SourceChannel" NOT NULL DEFAULT 'csv',
  "last_channel" "SourceChannel" NOT NULL DEFAULT 'csv',
  "total_orders" INTEGER NOT NULL DEFAULT 0,
  "total_spent" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "first_order_date" TIMESTAMP(3),
  "last_order_date" TIMESTAMP(3),
  "customer_status" "CustomerStatus" NOT NULL DEFAULT 'New',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "orders" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "customer_profile_id" TEXT NOT NULL,
  "external_order_id" TEXT,
  "source_channel" "SourceChannel" NOT NULL DEFAULT 'csv',
  "customer_name_raw" TEXT NOT NULL,
  "email_raw" TEXT,
  "phone_raw" TEXT,
  "province_raw" TEXT,
  "order_date" TIMESTAMP(3) NOT NULL,
  "total_amount" DECIMAL(12,2) NOT NULL,
  "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "shipping_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "platform_fee_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "refund_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "tax_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.07,
  "tax_included" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "platform_fee_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "refund_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tax_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.07;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tax_included" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "order_items" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "product_name" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_price" DECIMAL(12,2) NOT NULL,
  CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "imports" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "source_channel" "SourceChannel" NOT NULL,
  "import_status" "ImportStatus" NOT NULL DEFAULT 'pending',
  "total_rows" INTEGER NOT NULL DEFAULT 0,
  "imported_rows" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "imports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "csv_sync_connections" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "csv_url" TEXT NOT NULL,
  "source_channel" "SourceChannel" NOT NULL,
  "column_mapping" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "interval_minutes" INTEGER NOT NULL DEFAULT 60,
  "last_sync_status" "CsvSyncStatus",
  "last_sync_error" TEXT,
  "last_synced_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "csv_sync_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "csv_sync_runs" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "connection_id" TEXT NOT NULL,
  "status" "CsvSyncStatus" NOT NULL,
  "total_rows" INTEGER NOT NULL DEFAULT 0,
  "imported_rows" INTEGER NOT NULL DEFAULT 0,
  "error_message" TEXT,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  CONSTRAINT "csv_sync_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "integration_connections" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "provider" "IntegrationProvider" NOT NULL,
  "status" "IntegrationStatus" NOT NULL DEFAULT 'disconnected',
  "name" TEXT NOT NULL,
  "external_account_id" TEXT,
  "credentials_ref" TEXT,
  "scopes" TEXT[],
  "metadata" JSONB,
  "last_sync_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "integration_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ingestion_jobs" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "connection_id" TEXT,
  "provider" "IntegrationProvider" NOT NULL,
  "job_type" "IngestionJobType" NOT NULL,
  "status" "IngestionJobStatus" NOT NULL DEFAULT 'queued',
  "idempotency_key" TEXT,
  "total_rows" INTEGER NOT NULL DEFAULT 0,
  "processed_rows" INTEGER NOT NULL DEFAULT 0,
  "failed_rows" INTEGER NOT NULL DEFAULT 0,
  "error_message" TEXT,
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ingestion_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "raw_events" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "connection_id" TEXT,
  "ingestion_job_id" TEXT,
  "provider" "IntegrationProvider" NOT NULL,
  "external_id" TEXT,
  "event_type" TEXT NOT NULL,
  "dedupe_key" TEXT,
  "occurred_at" TIMESTAMP(3),
  "payload" JSONB NOT NULL,
  "status" "RawEventStatus" NOT NULL DEFAULT 'received',
  "error_message" TEXT,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "raw_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "normalized_orders" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "store_id" TEXT,
  "provider" "IntegrationProvider" NOT NULL,
  "external_order_id" TEXT NOT NULL,
  "external_customer_id" TEXT,
  "order_date" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'THB',
  "subtotal_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total_amount" DECIMAL(12,2) NOT NULL,
  "raw_payload" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "normalized_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "customer_identities" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "customer_profile_id" TEXT NOT NULL,
  "type" "CustomerIdentityType" NOT NULL,
  "value_hash" TEXT NOT NULL,
  "raw_value" TEXT,
  "source_channel" "SourceChannel",
  "confidence" DECIMAL(4,3) NOT NULL DEFAULT 1,
  "verified_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_identities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "customer_metric_snapshots" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "customer_profile_id" TEXT NOT NULL,
  "snapshot_date" TIMESTAMP(3) NOT NULL,
  "total_orders" INTEGER NOT NULL DEFAULT 0,
  "lifetime_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "predicted_lifetime_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "churn_risk_score" DECIMAL(5,4) NOT NULL DEFAULT 0,
  "repeat_probability" DECIMAL(5,4) NOT NULL DEFAULT 0,
  "segment_label" TEXT,
  "metrics" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_metric_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "cohort_metrics" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "cohort_month" TEXT NOT NULL,
  "month_offset" INTEGER NOT NULL,
  "active_customers" INTEGER NOT NULL DEFAULT 0,
  "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "retention_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cohort_metrics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "channel_attributions" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "source_channel" "SourceChannel" NOT NULL,
  "model" "AttributionModel" NOT NULL DEFAULT 'firstTouch',
  "first_touch_revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "repeat_revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "lifetime_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "customer_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "channel_attributions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "segments" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "SegmentType" NOT NULL,
  "rules" JSONB NOT NULL,
  "customer_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "segments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "recommendations" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "customer_profile_id" TEXT,
  "type" "RecommendationType" NOT NULL,
  "priority" "RecommendationPriority" NOT NULL DEFAULT 'medium',
  "status" "RecommendationStatus" NOT NULL DEFAULT 'open',
  "source" "RecommendationSource" NOT NULL DEFAULT 'rule',
  "title" TEXT NOT NULL,
  "detail" TEXT NOT NULL,
  "estimated_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "evidence" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "automation_rules" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "type" "AutomationType" NOT NULL,
  "name" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "trigger_config" JSONB NOT NULL,
  "action_config" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "automation_events" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "automation_rule_id" TEXT,
  "customer_profile_id" TEXT,
  "type" "AutomationType" NOT NULL,
  "status" "AutomationEventStatus" NOT NULL DEFAULT 'queued',
  "payload" JSONB NOT NULL,
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),
  CONSTRAINT "automation_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_slug_key" ON "organizations"("slug");
CREATE INDEX IF NOT EXISTS "organizations_created_by_user_id_idx" ON "organizations"("created_by_user_id");
CREATE INDEX IF NOT EXISTS "workspaces_organization_id_idx" ON "workspaces"("organization_id");
CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_organization_id_slug_key" ON "workspaces"("organization_id", "slug");
CREATE INDEX IF NOT EXISTS "memberships_user_id_idx" ON "memberships"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "memberships_organization_id_user_id_key" ON "memberships"("organization_id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "invitations_token_hash_key" ON "invitations"("token_hash");
CREATE INDEX IF NOT EXISTS "invitations_organization_id_email_idx" ON "invitations"("organization_id", "email");
CREATE INDEX IF NOT EXISTS "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_workspace_id_created_at_idx" ON "audit_logs"("workspace_id", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "billing_subscriptions_organization_id_key" ON "billing_subscriptions"("organization_id");
CREATE UNIQUE INDEX IF NOT EXISTS "billing_subscriptions_stripe_customer_id_key" ON "billing_subscriptions"("stripe_customer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "billing_subscriptions_stripe_subscription_id_key" ON "billing_subscriptions"("stripe_subscription_id");
CREATE INDEX IF NOT EXISTS "stores_workspace_id_idx" ON "stores"("workspace_id");
CREATE INDEX IF NOT EXISTS "stores_user_id_idx" ON "stores"("user_id");
CREATE INDEX IF NOT EXISTS "customer_profiles_store_id_phone_idx" ON "customer_profiles"("store_id", "phone");
CREATE INDEX IF NOT EXISTS "customer_profiles_store_id_email_idx" ON "customer_profiles"("store_id", "email");
CREATE INDEX IF NOT EXISTS "customer_profiles_store_id_line_id_idx" ON "customer_profiles"("store_id", "line_id");
CREATE INDEX IF NOT EXISTS "orders_store_id_source_channel_idx" ON "orders"("store_id", "source_channel");
CREATE INDEX IF NOT EXISTS "orders_customer_profile_id_order_date_idx" ON "orders"("customer_profile_id", "order_date");
CREATE UNIQUE INDEX IF NOT EXISTS "orders_store_id_external_order_id_source_channel_key" ON "orders"("store_id", "external_order_id", "source_channel");
CREATE INDEX IF NOT EXISTS "csv_sync_connections_store_id_enabled_idx" ON "csv_sync_connections"("store_id", "enabled");
CREATE INDEX IF NOT EXISTS "csv_sync_runs_store_id_started_at_idx" ON "csv_sync_runs"("store_id", "started_at");
CREATE INDEX IF NOT EXISTS "integration_connections_workspace_id_status_idx" ON "integration_connections"("workspace_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "integration_connections_workspace_id_provider_external_acco_key" ON "integration_connections"("workspace_id", "provider", "external_account_id");
CREATE UNIQUE INDEX IF NOT EXISTS "ingestion_jobs_idempotency_key_key" ON "ingestion_jobs"("idempotency_key");
CREATE INDEX IF NOT EXISTS "ingestion_jobs_workspace_id_status_created_at_idx" ON "ingestion_jobs"("workspace_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "raw_events_workspace_id_status_created_at_idx" ON "raw_events"("workspace_id", "status", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "raw_events_workspace_id_provider_dedupe_key_key" ON "raw_events"("workspace_id", "provider", "dedupe_key");
CREATE INDEX IF NOT EXISTS "normalized_orders_workspace_id_order_date_idx" ON "normalized_orders"("workspace_id", "order_date");
CREATE UNIQUE INDEX IF NOT EXISTS "normalized_orders_workspace_id_provider_external_order_id_key" ON "normalized_orders"("workspace_id", "provider", "external_order_id");
CREATE INDEX IF NOT EXISTS "customer_identities_customer_profile_id_idx" ON "customer_identities"("customer_profile_id");
CREATE UNIQUE INDEX IF NOT EXISTS "customer_identities_workspace_id_type_value_hash_key" ON "customer_identities"("workspace_id", "type", "value_hash");
CREATE INDEX IF NOT EXISTS "customer_metric_snapshots_workspace_id_snapshot_date_idx" ON "customer_metric_snapshots"("workspace_id", "snapshot_date");
CREATE UNIQUE INDEX IF NOT EXISTS "customer_metric_snapshots_workspace_id_customer_profile_id__key" ON "customer_metric_snapshots"("workspace_id", "customer_profile_id", "snapshot_date");
CREATE INDEX IF NOT EXISTS "cohort_metrics_workspace_id_cohort_month_idx" ON "cohort_metrics"("workspace_id", "cohort_month");
CREATE UNIQUE INDEX IF NOT EXISTS "cohort_metrics_workspace_id_cohort_month_month_offset_key" ON "cohort_metrics"("workspace_id", "cohort_month", "month_offset");
CREATE UNIQUE INDEX IF NOT EXISTS "channel_attributions_workspace_id_source_channel_model_key" ON "channel_attributions"("workspace_id", "source_channel", "model");
CREATE UNIQUE INDEX IF NOT EXISTS "segments_workspace_id_name_key" ON "segments"("workspace_id", "name");
CREATE INDEX IF NOT EXISTS "recommendations_workspace_id_status_priority_idx" ON "recommendations"("workspace_id", "status", "priority");
CREATE INDEX IF NOT EXISTS "automation_rules_workspace_id_enabled_idx" ON "automation_rules"("workspace_id", "enabled");
CREATE INDEX IF NOT EXISTS "automation_events_workspace_id_status_created_at_idx" ON "automation_events"("workspace_id", "status", "created_at");

CREATE OR REPLACE FUNCTION "_repeat_tree_add_constraint_if_missing"(
  target_table TEXT,
  target_constraint TEXT,
  constraint_sql TEXT
) RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = target_table::regclass
      AND conname = target_constraint
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I %s', target_table, target_constraint, constraint_sql);
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT "_repeat_tree_add_constraint_if_missing"('organizations', 'organizations_created_by_user_id_fkey', 'FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('workspaces', 'workspaces_organization_id_fkey', 'FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('memberships', 'memberships_organization_id_fkey', 'FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('memberships', 'memberships_user_id_fkey', 'FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('invitations', 'invitations_organization_id_fkey', 'FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('invitations', 'invitations_invited_by_user_id_fkey', 'FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('audit_logs', 'audit_logs_organization_id_fkey', 'FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('audit_logs', 'audit_logs_workspace_id_fkey', 'FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('audit_logs', 'audit_logs_actor_user_id_fkey', 'FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('billing_subscriptions', 'billing_subscriptions_organization_id_fkey', 'FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('stores', 'stores_workspace_id_fkey', 'FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('customer_profiles', 'customer_profiles_store_id_fkey', 'FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('orders', 'orders_store_id_fkey', 'FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('orders', 'orders_customer_profile_id_fkey', 'FOREIGN KEY ("customer_profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('order_items', 'order_items_order_id_fkey', 'FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('imports', 'imports_store_id_fkey', 'FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('csv_sync_connections', 'csv_sync_connections_store_id_fkey', 'FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('csv_sync_runs', 'csv_sync_runs_store_id_fkey', 'FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('csv_sync_runs', 'csv_sync_runs_connection_id_fkey', 'FOREIGN KEY ("connection_id") REFERENCES "csv_sync_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('integration_connections', 'integration_connections_workspace_id_fkey', 'FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('ingestion_jobs', 'ingestion_jobs_workspace_id_fkey', 'FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('ingestion_jobs', 'ingestion_jobs_connection_id_fkey', 'FOREIGN KEY ("connection_id") REFERENCES "integration_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('raw_events', 'raw_events_workspace_id_fkey', 'FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('raw_events', 'raw_events_connection_id_fkey', 'FOREIGN KEY ("connection_id") REFERENCES "integration_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('raw_events', 'raw_events_ingestion_job_id_fkey', 'FOREIGN KEY ("ingestion_job_id") REFERENCES "ingestion_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('normalized_orders', 'normalized_orders_workspace_id_fkey', 'FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('customer_identities', 'customer_identities_workspace_id_fkey', 'FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('customer_identities', 'customer_identities_customer_profile_id_fkey', 'FOREIGN KEY ("customer_profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('customer_metric_snapshots', 'customer_metric_snapshots_workspace_id_fkey', 'FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('customer_metric_snapshots', 'customer_metric_snapshots_customer_profile_id_fkey', 'FOREIGN KEY ("customer_profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('cohort_metrics', 'cohort_metrics_workspace_id_fkey', 'FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('channel_attributions', 'channel_attributions_workspace_id_fkey', 'FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('segments', 'segments_workspace_id_fkey', 'FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('recommendations', 'recommendations_workspace_id_fkey', 'FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('recommendations', 'recommendations_customer_profile_id_fkey', 'FOREIGN KEY ("customer_profile_id") REFERENCES "customer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('automation_rules', 'automation_rules_workspace_id_fkey', 'FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('automation_events', 'automation_events_workspace_id_fkey', 'FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE');
SELECT "_repeat_tree_add_constraint_if_missing"('automation_events', 'automation_events_automation_rule_id_fkey', 'FOREIGN KEY ("automation_rule_id") REFERENCES "automation_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE');

DROP FUNCTION "_repeat_tree_add_constraint_if_missing"(TEXT, TEXT, TEXT);
