CREATE TABLE IF NOT EXISTS "estimate_request_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid NOT NULL REFERENCES "leads"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "title" text NOT NULL,
  "assignee" text,
  "due_at" timestamptz,
  "status" text DEFAULT 'open' NOT NULL,
  "created_by" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "estimate_request_comments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid NOT NULL REFERENCES "leads"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "actor" text NOT NULL,
  "body" text NOT NULL
);

CREATE INDEX IF NOT EXISTS "estimate_request_tasks_lead_id_idx"
  ON "estimate_request_tasks" ("lead_id");
CREATE INDEX IF NOT EXISTS "estimate_request_tasks_status_idx"
  ON "estimate_request_tasks" ("status");
CREATE INDEX IF NOT EXISTS "estimate_request_comments_lead_id_idx"
  ON "estimate_request_comments" ("lead_id");
