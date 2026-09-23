CREATE TABLE IF NOT EXISTS "labor_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "job_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "work_date" date NOT NULL,
  "kind" text NOT NULL,
  "minutes" integer,
  "quantity" integer,
  "unit" text DEFAULT '' NOT NULL,
  "note" text DEFAULT '' NOT NULL,
  "created_by" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "labor_entries_slot_unique" UNIQUE ("organization_id", "job_id", "user_id", "work_date", "kind", "unit"),
  CONSTRAINT "labor_entries_kind_valid" CHECK ("kind" IN ('hourly', 'piece')),
  CONSTRAINT "labor_entries_measure_valid" CHECK ((
    "kind" = 'hourly'
    AND "minutes" > 0
    AND "minutes" <= 1440
    AND "quantity" IS NULL
    AND "unit" = ''
  ) OR (
    "kind" = 'piece'
    AND "quantity" > 0
    AND "minutes" IS NULL
    AND "unit" IN ('bags', 'sq_ft')
  ))
);

DO $$ BEGIN
  ALTER TABLE "labor_entries" ADD CONSTRAINT "labor_entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "labor_entries" ADD CONSTRAINT "labor_entries_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "labor_entries" ADD CONSTRAINT "labor_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "labor_entries_day_idx" ON "labor_entries" ("organization_id", "work_date");
