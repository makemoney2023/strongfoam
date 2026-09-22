CREATE TABLE IF NOT EXISTS "dispatches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "job_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "work_date" date NOT NULL,
  "status" text NOT NULL,
  "note" text DEFAULT '' NOT NULL,
  "created_by" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "dispatches_slot_unique" UNIQUE ("organization_id", "job_id", "user_id", "work_date"),
  CONSTRAINT "dispatches_status_valid" CHECK ("status" IN ('scheduled', 'cancelled'))
);

DO $$ BEGIN
  ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "dispatches_day_idx" ON "dispatches" ("organization_id", "work_date");
