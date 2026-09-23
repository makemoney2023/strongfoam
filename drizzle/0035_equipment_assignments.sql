CREATE TABLE IF NOT EXISTS "equipment_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "job_id" uuid NOT NULL,
  "name" text NOT NULL,
  "name_key" text NOT NULL,
  "note" text DEFAULT '' NOT NULL,
  "status" text NOT NULL,
  "created_by" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "equipment_assignments_slot_unique" UNIQUE ("organization_id", "job_id", "name_key"),
  CONSTRAINT "equipment_assignments_status_valid" CHECK ("status" IN ('assigned', 'released')),
  CONSTRAINT "equipment_assignments_name_valid" CHECK (
    char_length("name") BETWEEN 1 AND 80
    AND "name_key" = lower("name")
    AND char_length("note") <= 500
  )
);

DO $$ BEGIN
  ALTER TABLE "equipment_assignments" ADD CONSTRAINT "equipment_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "equipment_assignments" ADD CONSTRAINT "equipment_assignments_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "equipment_assignments_job_idx" ON "equipment_assignments" ("organization_id", "job_id");
CREATE INDEX IF NOT EXISTS "equipment_assignments_active_idx" ON "equipment_assignments" ("organization_id", "name_key") WHERE "status" = 'assigned';
