-- Expand-only migration for retry-safe lifecycle automation events.
ALTER TABLE "automation_events"
ADD COLUMN "idempotency_key" TEXT;

CREATE UNIQUE INDEX "automation_events_idempotency_key_key"
ON "automation_events"("idempotency_key");
