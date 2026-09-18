ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "project_id" uuid;

CREATE TABLE IF NOT EXISTS "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "company_id" uuid REFERENCES "companies"("id"),
  "site_id" uuid REFERENCES "sites"("id"),
  "opportunity_id" uuid REFERENCES "opportunities"("id"),
  "source_lead_id" uuid REFERENCES "leads"("id"),
  "name" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "project_manager" text
);

CREATE TABLE IF NOT EXISTS "jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "project_id" uuid REFERENCES "projects"("id"),
  "company_id" uuid REFERENCES "companies"("id"),
  "site_id" uuid REFERENCES "sites"("id"),
  "opportunity_id" uuid REFERENCES "opportunities"("id"),
  "name" text NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "scope" text,
  "services" text[] NOT NULL,
  "project_manager" text,
  "foreman" text,
  "planned_start_at" timestamptz,
  "planned_end_at" timestamptz,
  "blocker_note" text
);

CREATE TABLE IF NOT EXISTS "job_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid NOT NULL REFERENCES "jobs"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "actor" text NOT NULL,
  "kind" text NOT NULL,
  "summary" text NOT NULL,
  "payload" jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS "projects_company_id_idx" ON "projects" ("company_id");
CREATE INDEX IF NOT EXISTS "projects_opportunity_id_idx" ON "projects" ("opportunity_id");
CREATE INDEX IF NOT EXISTS "jobs_project_id_idx" ON "jobs" ("project_id");
CREATE INDEX IF NOT EXISTS "jobs_status_idx" ON "jobs" ("status");
CREATE INDEX IF NOT EXISTS "job_events_job_id_idx" ON "job_events" ("job_id");
