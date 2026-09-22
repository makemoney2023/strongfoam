CREATE TABLE IF NOT EXISTS "outbox_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "kind" text NOT NULL,
  "aggregate_type" text NOT NULL,
  "aggregate_id" uuid NOT NULL,
  "idempotency_key" text NOT NULL,
  "payload" jsonb NOT NULL,
  "published_at" timestamptz
);

ALTER TABLE "outbox_events"
  DROP CONSTRAINT IF EXISTS "outbox_events_organization_idempotency_unique";
ALTER TABLE "outbox_events"
  ADD CONSTRAINT "outbox_events_organization_idempotency_unique"
  UNIQUE ("organization_id", "idempotency_key");
CREATE INDEX IF NOT EXISTS "outbox_events_unpublished_idx"
  ON "outbox_events" ("organization_id", "published_at");

CREATE TABLE IF NOT EXISTS "background_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "kind" text NOT NULL,
  "aggregate_type" text NOT NULL,
  "aggregate_id" uuid NOT NULL,
  "idempotency_key" text NOT NULL,
  "status" text DEFAULT 'queued' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "max_attempts" integer DEFAULT 5 NOT NULL,
  "checkpoint" jsonb,
  "locked_by" text,
  "next_run_at" timestamptz,
  "payload" jsonb NOT NULL,
  "last_error" text,
  CONSTRAINT "background_jobs_status_valid" CHECK (
    "status" IN (
      'queued',
      'running',
      'retry_wait',
      'completed',
      'dead_letter',
      'cancelled'
    )
  )
);

ALTER TABLE "background_jobs"
  DROP CONSTRAINT IF EXISTS "background_jobs_organization_idempotency_unique";
ALTER TABLE "background_jobs"
  ADD CONSTRAINT "background_jobs_organization_idempotency_unique"
  UNIQUE ("organization_id", "idempotency_key");
CREATE INDEX IF NOT EXISTS "background_jobs_status_idx"
  ON "background_jobs" ("organization_id", "status", "next_run_at");

CREATE TABLE IF NOT EXISTS "dead_letter_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "background_job_id" uuid NOT NULL REFERENCES "background_jobs"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "kind" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "attempts" integer NOT NULL,
  "checkpoint" jsonb,
  "last_error" text,
  "payload" jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS "dead_letter_jobs_organization_idx"
  ON "dead_letter_jobs" ("organization_id");
