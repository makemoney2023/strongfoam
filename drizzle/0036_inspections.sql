CREATE TABLE IF NOT EXISTS "inspections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "job_id" uuid NOT NULL,
  "name" text NOT NULL,
  "name_key" text NOT NULL,
  "result" text NOT NULL,
  "note" text DEFAULT '' NOT NULL,
  "created_by" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "inspections_slot_unique" UNIQUE ("organization_id", "job_id", "name_key"),
  CONSTRAINT "inspections_result_valid" CHECK ("result" IN ('open', 'passed', 'failed')),
  CONSTRAINT "inspections_name_valid" CHECK (
    char_length("name") BETWEEN 1 AND 80
    AND "name_key" = lower("name")
    AND char_length("note") <= 500
  )
);

DO $$ BEGIN
  ALTER TABLE "inspections" ADD CONSTRAINT "inspections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "inspections" ADD CONSTRAINT "inspections_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "inspections_job_idx" ON "inspections" ("organization_id", "job_id");
CREATE INDEX IF NOT EXISTS "inspections_attention_idx" ON "inspections" ("organization_id", "result") WHERE "result" IN ('open', 'failed');
