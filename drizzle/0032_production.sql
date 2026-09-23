CREATE TABLE IF NOT EXISTS "production_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "job_id" uuid NOT NULL,
  "work_date" date NOT NULL,
  "task_id" uuid,
  "work_area_id" uuid,
  "trade" text NOT NULL,
  "work_type" text NOT NULL,
  "unit" text NOT NULL,
  "quantity" integer NOT NULL,
  "attribution_mode" text NOT NULL,
  "status" text NOT NULL,
  "recorded_by" text NOT NULL,
  "verified_by" text,
  "verified_at" timestamptz,
  "source_type" text,
  "source_id" uuid,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "production_entries_unit_valid" CHECK ("unit" IN ('bags', 'sq_ft')),
  CONSTRAINT "production_entries_quantity_valid" CHECK ("quantity" > 0 AND "quantity" <= 1000000),
  CONSTRAINT "production_entries_mode_valid" CHECK ("attribution_mode" IN ('crew', 'individual')),
  CONSTRAINT "production_entries_status_valid" CHECK ("status" IN ('draft', 'verified', 'void'))
);

CREATE TABLE IF NOT EXISTS "production_participants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "production_entry_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "labor_entry_id" uuid,
  CONSTRAINT "production_participants_entry_user_unique" UNIQUE ("production_entry_id", "user_id")
);

CREATE TABLE IF NOT EXISTS "production_allocations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "production_entry_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "quantity" integer NOT NULL,
  CONSTRAINT "production_allocations_entry_user_unique" UNIQUE ("production_entry_id", "user_id"),
  CONSTRAINT "production_allocations_quantity_valid" CHECK ("quantity" > 0 AND "quantity" <= 1000000)
);

CREATE TABLE IF NOT EXISTS "production_targets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "trade" text NOT NULL,
  "work_type" text NOT NULL,
  "unit" text NOT NULL,
  "basis" text NOT NULL,
  "rate_milli" integer NOT NULL,
  "effective_from" date NOT NULL,
  "effective_to" date,
  "approved_by" text NOT NULL,
  "approved_at" timestamptz NOT NULL,
  CONSTRAINT "production_targets_unit_valid" CHECK ("unit" IN ('bags', 'sq_ft')),
  CONSTRAINT "production_targets_basis_valid" CHECK ("basis" IN ('crew_hour', 'person_hour')),
  CONSTRAINT "production_targets_rate_positive" CHECK ("rate_milli" > 0)
);

DO $$ BEGIN
  ALTER TABLE "production_entries" ADD CONSTRAINT "production_entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "production_entries" ADD CONSTRAINT "production_entries_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "production_entries" ADD CONSTRAINT "production_entries_task_id_job_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."job_tasks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "production_entries" ADD CONSTRAINT "production_entries_work_area_id_work_areas_id_fk" FOREIGN KEY ("work_area_id") REFERENCES "public"."work_areas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "production_participants" ADD CONSTRAINT "production_participants_production_entry_id_production_entries_id_fk" FOREIGN KEY ("production_entry_id") REFERENCES "public"."production_entries"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "production_participants" ADD CONSTRAINT "production_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "production_participants" ADD CONSTRAINT "production_participants_labor_entry_id_labor_entries_id_fk" FOREIGN KEY ("labor_entry_id") REFERENCES "public"."labor_entries"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "production_allocations" ADD CONSTRAINT "production_allocations_production_entry_id_production_entries_id_fk" FOREIGN KEY ("production_entry_id") REFERENCES "public"."production_entries"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "production_allocations" ADD CONSTRAINT "production_allocations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "production_targets" ADD CONSTRAINT "production_targets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "production_entries_day_idx" ON "production_entries" ("organization_id", "work_date");
CREATE UNIQUE INDEX IF NOT EXISTS "production_participants_labor_unique" ON "production_participants" ("labor_entry_id") WHERE "labor_entry_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "production_targets_class_idx" ON "production_targets" ("organization_id", "trade", "work_type", "unit", "basis");
