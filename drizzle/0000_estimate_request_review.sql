ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz DEFAULT now() NOT NULL;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "workflow_status" text DEFAULT 'new' NOT NULL;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "assigned_to" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "next_action" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "next_action_due_at" timestamptz;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "lost_reason" text;

CREATE TABLE IF NOT EXISTS "estimate_request_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid NOT NULL REFERENCES "leads"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "actor" text NOT NULL,
  "kind" text NOT NULL,
  "summary" text NOT NULL,
  "payload" jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS "estimate_request_events_lead_id_idx"
  ON "estimate_request_events" ("lead_id");
CREATE INDEX IF NOT EXISTS "leads_workflow_status_idx"
  ON "leads" ("workflow_status");
CREATE INDEX IF NOT EXISTS "leads_created_at_idx"
  ON "leads" ("created_at");
