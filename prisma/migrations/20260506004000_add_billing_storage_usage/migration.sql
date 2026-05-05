ALTER TABLE "billing_subscriptions"
  ADD COLUMN IF NOT EXISTS "database_storage_mb_limit" INTEGER NOT NULL DEFAULT 512,
  ADD COLUMN IF NOT EXISTS "database_storage_mb_usage" INTEGER NOT NULL DEFAULT 0;

UPDATE "billing_subscriptions"
SET "database_storage_mb_limit" = CASE "plan"
  WHEN 'starter' THEN 512
  WHEN 'growth' THEN 2048
  WHEN 'scale' THEN 10240
  WHEN 'enterprise' THEN 102400
  ELSE 512
END;
